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
	    oclc = entry.oclc,
	    link = entry.link;


	var imageHTML = images.length ? images.map(function (image) {
		return imageTemplate(image);
	}).join('') : '';

	return '\n\t\t<article class="article__outer">\n\t\t\t<div class="article__inner">\n\t\t\t\t<div class="article__heading">\n\t\t\t\t\t<a class="js-entry-title"></a>\n\t\t\t\t\t<h2 class="article-heading__title">' + title + '</h2>\n\t\t\t\t\t<div class="article-heading__name">\n\t\t\t\t\t\t<span class="article-heading__name--first">' + firstName + '</span>\n\t\t\t\t\t\t<a class="js-entry-artist"></a>\n\t\t\t\t\t\t<span class="article-heading__name--last">' + lastName + '</span>\n\t\t\t\t\t</div>\n\t\t\t\t</div>\t\n\t\t\t\t<div class="article__slider-outer">\n\t\t\t\t\t<div class="article__slider-inner" id="slider-' + i + '">\n\t\t\t\t\t\t' + imageHTML + '\n\t\t\t\t\t\t<div class="article-description__outer">\n\t\t\t\t\t\t\t<div class="article-description">' + description + '</div>\n\t\t\t\t\t\t\t<div class="article-detail">' + contents + '</div>\n\t\t\t\t\t\t\t<div class="article-detail article-detail--margin">' + dimensions + '</div>\n\t\t\t\t\t\t\t<div class="article-detail article-detail--margin">' + year + '</div>\n\t\t\t\t\t\t\t<div class="article-detail article-detail--margin">' + isbn + '</div>\n\t\t\t\t\t\t\t<div class="article-detail">OCLC <a class="article-detail--link" target="_blank" href="' + link + '">' + oclc + '</a></div>\n\t\t\t\t\t\t</div>\n\t\t\t\t\t</div>\n\t\t\t\t\t<div class="article__scroll-controls">\n\t\t\t\t\t\t<span class="controls arrow-prev">\u2190</span> \n\t\t\t\t\t\t<span class="controls arrow-next">\u2192</span>\n\t\t\t\t\t</div>\n\t\t\t\t\t<p class="js-article-anchor-target"></p>\n\t\t\t</div>\n\t\t</article>\n\t';
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvc21vb3Roc2Nyb2xsLXBvbHlmaWxsL2Rpc3Qvc21vb3Roc2Nyb2xsLmpzIiwic3JjL2pzL2NvbnN0YW50cy5qcyIsInNyYy9qcy9pbmRleC5qcyIsInNyYy9qcy9tb2R1bGVzL2F0dGFjaEltYWdlTGlzdGVuZXJzLmpzIiwic3JjL2pzL21vZHVsZXMvYXR0YWNoTW9kYWxMaXN0ZW5lcnMuanMiLCJzcmMvanMvbW9kdWxlcy9hdHRhY2hVcEFycm93TGlzdGVuZXJzLmpzIiwic3JjL2pzL21vZHVsZXMvaW5kZXguanMiLCJzcmMvanMvbW9kdWxlcy9tYWtlQWxwaGFiZXQuanMiLCJzcmMvanMvbW9kdWxlcy9tYWtlU2xpZGVyLmpzIiwic3JjL2pzL3RlbXBsYXRlcy9hcnRpY2xlLmpzIiwic3JjL2pzL3RlbXBsYXRlcy9pbmRleC5qcyIsInNyYy9qcy90ZW1wbGF0ZXMvbmF2TGcuanMiLCJzcmMvanMvdXRpbHMvaW5kZXguanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNB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LENBQVMsS0FBVCxFQUFlLFVBQWYsQ0FBTjtBQUFBLEtBQXJCOztBQUVBLGlCQUFhLE9BQWI7QUFDQSxjQUFVLFdBQVcsWUFBWCxFQUF5QixJQUF6QixDQUFWO0FBQ0QsR0FMRDtBQU1ELENBVEQ7O0FBV0EsSUFBTSxjQUFjLFNBQWQsV0FBYyxHQUFNO0FBQ3pCLHNCQUFTLE9BQVQsQ0FBaUI7QUFBQSxXQUFRLEtBQUssU0FBTCxDQUFlLEdBQWYsQ0FBbUIsT0FBbkIsQ0FBUjtBQUFBLEdBQWpCO0FBQ0Esa0JBQUssU0FBTCxDQUFlLEdBQWYsQ0FBbUIsT0FBbkI7QUFDQSxDQUhEOztBQUtBLElBQU0sY0FBYyxTQUFkLFdBQWMsR0FBTTtBQUN6QixNQUFJLE1BQU0sU0FBUyxjQUFULENBQXdCLGVBQXhCLENBQVY7QUFDQSxNQUFJLGNBQUosQ0FBbUIsRUFBQyxVQUFVLFFBQVgsRUFBcUIsT0FBTyxPQUE1QixFQUFuQjtBQUNBLENBSEQ7O1FBS1MsUSxHQUFBLFE7UUFBVSxXLEdBQUEsVztRQUFhLFcsR0FBQSxXIiwiZmlsZSI6ImJ1bmRsZS5qcyIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbigpe2Z1bmN0aW9uIHIoZSxuLHQpe2Z1bmN0aW9uIG8oaSxmKXtpZighbltpXSl7aWYoIWVbaV0pe3ZhciBjPVwiZnVuY3Rpb25cIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmU7aWYoIWYmJmMpcmV0dXJuIGMoaSwhMCk7aWYodSlyZXR1cm4gdShpLCEwKTt2YXIgYT1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK2krXCInXCIpO3Rocm93IGEuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixhfXZhciBwPW5baV09e2V4cG9ydHM6e319O2VbaV1bMF0uY2FsbChwLmV4cG9ydHMsZnVuY3Rpb24ocil7dmFyIG49ZVtpXVsxXVtyXTtyZXR1cm4gbyhufHxyKX0scCxwLmV4cG9ydHMscixlLG4sdCl9cmV0dXJuIG5baV0uZXhwb3J0c31mb3IodmFyIHU9XCJmdW5jdGlvblwiPT10eXBlb2YgcmVxdWlyZSYmcmVxdWlyZSxpPTA7aTx0Lmxlbmd0aDtpKyspbyh0W2ldKTtyZXR1cm4gb31yZXR1cm4gcn0pKCkiLCIvKiBzbW9vdGhzY3JvbGwgdjAuNC4wIC0gMjAxOCAtIER1c3RhbiBLYXN0ZW4sIEplcmVtaWFzIE1lbmljaGVsbGkgLSBNSVQgTGljZW5zZSAqL1xuKGZ1bmN0aW9uICgpIHtcbiAgJ3VzZSBzdHJpY3QnO1xuXG4gIC8vIHBvbHlmaWxsXG4gIGZ1bmN0aW9uIHBvbHlmaWxsKCkge1xuICAgIC8vIGFsaWFzZXNcbiAgICB2YXIgdyA9IHdpbmRvdztcbiAgICB2YXIgZCA9IGRvY3VtZW50O1xuXG4gICAgLy8gcmV0dXJuIGlmIHNjcm9sbCBiZWhhdmlvciBpcyBzdXBwb3J0ZWQgYW5kIHBvbHlmaWxsIGlzIG5vdCBmb3JjZWRcbiAgICBpZiAoXG4gICAgICAnc2Nyb2xsQmVoYXZpb3InIGluIGQuZG9jdW1lbnRFbGVtZW50LnN0eWxlICYmXG4gICAgICB3Ll9fZm9yY2VTbW9vdGhTY3JvbGxQb2x5ZmlsbF9fICE9PSB0cnVlXG4gICAgKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgLy8gZ2xvYmFsc1xuICAgIHZhciBFbGVtZW50ID0gdy5IVE1MRWxlbWVudCB8fCB3LkVsZW1lbnQ7XG4gICAgdmFyIFNDUk9MTF9USU1FID0gNDY4O1xuXG4gICAgLy8gb2JqZWN0IGdhdGhlcmluZyBvcmlnaW5hbCBzY3JvbGwgbWV0aG9kc1xuICAgIHZhciBvcmlnaW5hbCA9IHtcbiAgICAgIHNjcm9sbDogdy5zY3JvbGwgfHwgdy5zY3JvbGxUbyxcbiAgICAgIHNjcm9sbEJ5OiB3LnNjcm9sbEJ5LFxuICAgICAgZWxlbWVudFNjcm9sbDogRWxlbWVudC5wcm90b3R5cGUuc2Nyb2xsIHx8IHNjcm9sbEVsZW1lbnQsXG4gICAgICBzY3JvbGxJbnRvVmlldzogRWxlbWVudC5wcm90b3R5cGUuc2Nyb2xsSW50b1ZpZXdcbiAgICB9O1xuXG4gICAgLy8gZGVmaW5lIHRpbWluZyBtZXRob2RcbiAgICB2YXIgbm93ID1cbiAgICAgIHcucGVyZm9ybWFuY2UgJiYgdy5wZXJmb3JtYW5jZS5ub3dcbiAgICAgICAgPyB3LnBlcmZvcm1hbmNlLm5vdy5iaW5kKHcucGVyZm9ybWFuY2UpXG4gICAgICAgIDogRGF0ZS5ub3c7XG5cbiAgICAvKipcbiAgICAgKiBpbmRpY2F0ZXMgaWYgYSB0aGUgY3VycmVudCBicm93c2VyIGlzIG1hZGUgYnkgTWljcm9zb2Z0XG4gICAgICogQG1ldGhvZCBpc01pY3Jvc29mdEJyb3dzZXJcbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gdXNlckFnZW50XG4gICAgICogQHJldHVybnMge0Jvb2xlYW59XG4gICAgICovXG4gICAgZnVuY3Rpb24gaXNNaWNyb3NvZnRCcm93c2VyKHVzZXJBZ2VudCkge1xuICAgICAgdmFyIHVzZXJBZ2VudFBhdHRlcm5zID0gWydNU0lFICcsICdUcmlkZW50LycsICdFZGdlLyddO1xuXG4gICAgICByZXR1cm4gbmV3IFJlZ0V4cCh1c2VyQWdlbnRQYXR0ZXJucy5qb2luKCd8JykpLnRlc3QodXNlckFnZW50KTtcbiAgICB9XG5cbiAgICAvKlxuICAgICAqIElFIGhhcyByb3VuZGluZyBidWcgcm91bmRpbmcgZG93biBjbGllbnRIZWlnaHQgYW5kIGNsaWVudFdpZHRoIGFuZFxuICAgICAqIHJvdW5kaW5nIHVwIHNjcm9sbEhlaWdodCBhbmQgc2Nyb2xsV2lkdGggY2F1c2luZyBmYWxzZSBwb3NpdGl2ZXNcbiAgICAgKiBvbiBoYXNTY3JvbGxhYmxlU3BhY2VcbiAgICAgKi9cbiAgICB2YXIgUk9VTkRJTkdfVE9MRVJBTkNFID0gaXNNaWNyb3NvZnRCcm93c2VyKHcubmF2aWdhdG9yLnVzZXJBZ2VudCkgPyAxIDogMDtcblxuICAgIC8qKlxuICAgICAqIGNoYW5nZXMgc2Nyb2xsIHBvc2l0aW9uIGluc2lkZSBhbiBlbGVtZW50XG4gICAgICogQG1ldGhvZCBzY3JvbGxFbGVtZW50XG4gICAgICogQHBhcmFtIHtOdW1iZXJ9IHhcbiAgICAgKiBAcGFyYW0ge051bWJlcn0geVxuICAgICAqIEByZXR1cm5zIHt1bmRlZmluZWR9XG4gICAgICovXG4gICAgZnVuY3Rpb24gc2Nyb2xsRWxlbWVudCh4LCB5KSB7XG4gICAgICB0aGlzLnNjcm9sbExlZnQgPSB4O1xuICAgICAgdGhpcy5zY3JvbGxUb3AgPSB5O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIHJldHVybnMgcmVzdWx0IG9mIGFwcGx5aW5nIGVhc2UgbWF0aCBmdW5jdGlvbiB0byBhIG51bWJlclxuICAgICAqIEBtZXRob2QgZWFzZVxuICAgICAqIEBwYXJhbSB7TnVtYmVyfSBrXG4gICAgICogQHJldHVybnMge051bWJlcn1cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBlYXNlKGspIHtcbiAgICAgIHJldHVybiAwLjUgKiAoMSAtIE1hdGguY29zKE1hdGguUEkgKiBrKSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogaW5kaWNhdGVzIGlmIGEgc21vb3RoIGJlaGF2aW9yIHNob3VsZCBiZSBhcHBsaWVkXG4gICAgICogQG1ldGhvZCBzaG91bGRCYWlsT3V0XG4gICAgICogQHBhcmFtIHtOdW1iZXJ8T2JqZWN0fSBmaXJzdEFyZ1xuICAgICAqIEByZXR1cm5zIHtCb29sZWFufVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIHNob3VsZEJhaWxPdXQoZmlyc3RBcmcpIHtcbiAgICAgIGlmIChcbiAgICAgICAgZmlyc3RBcmcgPT09IG51bGwgfHxcbiAgICAgICAgdHlwZW9mIGZpcnN0QXJnICE9PSAnb2JqZWN0JyB8fFxuICAgICAgICBmaXJzdEFyZy5iZWhhdmlvciA9PT0gdW5kZWZpbmVkIHx8XG4gICAgICAgIGZpcnN0QXJnLmJlaGF2aW9yID09PSAnYXV0bycgfHxcbiAgICAgICAgZmlyc3RBcmcuYmVoYXZpb3IgPT09ICdpbnN0YW50J1xuICAgICAgKSB7XG4gICAgICAgIC8vIGZpcnN0IGFyZ3VtZW50IGlzIG5vdCBhbiBvYmplY3QvbnVsbFxuICAgICAgICAvLyBvciBiZWhhdmlvciBpcyBhdXRvLCBpbnN0YW50IG9yIHVuZGVmaW5lZFxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH1cblxuICAgICAgaWYgKHR5cGVvZiBmaXJzdEFyZyA9PT0gJ29iamVjdCcgJiYgZmlyc3RBcmcuYmVoYXZpb3IgPT09ICdzbW9vdGgnKSB7XG4gICAgICAgIC8vIGZpcnN0IGFyZ3VtZW50IGlzIGFuIG9iamVjdCBhbmQgYmVoYXZpb3IgaXMgc21vb3RoXG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cblxuICAgICAgLy8gdGhyb3cgZXJyb3Igd2hlbiBiZWhhdmlvciBpcyBub3Qgc3VwcG9ydGVkXG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFxuICAgICAgICAnYmVoYXZpb3IgbWVtYmVyIG9mIFNjcm9sbE9wdGlvbnMgJyArXG4gICAgICAgICAgZmlyc3RBcmcuYmVoYXZpb3IgK1xuICAgICAgICAgICcgaXMgbm90IGEgdmFsaWQgdmFsdWUgZm9yIGVudW1lcmF0aW9uIFNjcm9sbEJlaGF2aW9yLidcbiAgICAgICk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogaW5kaWNhdGVzIGlmIGFuIGVsZW1lbnQgaGFzIHNjcm9sbGFibGUgc3BhY2UgaW4gdGhlIHByb3ZpZGVkIGF4aXNcbiAgICAgKiBAbWV0aG9kIGhhc1Njcm9sbGFibGVTcGFjZVxuICAgICAqIEBwYXJhbSB7Tm9kZX0gZWxcbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gYXhpc1xuICAgICAqIEByZXR1cm5zIHtCb29sZWFufVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGhhc1Njcm9sbGFibGVTcGFjZShlbCwgYXhpcykge1xuICAgICAgaWYgKGF4aXMgPT09ICdZJykge1xuICAgICAgICByZXR1cm4gZWwuY2xpZW50SGVpZ2h0ICsgUk9VTkRJTkdfVE9MRVJBTkNFIDwgZWwuc2Nyb2xsSGVpZ2h0O1xuICAgICAgfVxuXG4gICAgICBpZiAoYXhpcyA9PT0gJ1gnKSB7XG4gICAgICAgIHJldHVybiBlbC5jbGllbnRXaWR0aCArIFJPVU5ESU5HX1RPTEVSQU5DRSA8IGVsLnNjcm9sbFdpZHRoO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIGluZGljYXRlcyBpZiBhbiBlbGVtZW50IGhhcyBhIHNjcm9sbGFibGUgb3ZlcmZsb3cgcHJvcGVydHkgaW4gdGhlIGF4aXNcbiAgICAgKiBAbWV0aG9kIGNhbk92ZXJmbG93XG4gICAgICogQHBhcmFtIHtOb2RlfSBlbFxuICAgICAqIEBwYXJhbSB7U3RyaW5nfSBheGlzXG4gICAgICogQHJldHVybnMge0Jvb2xlYW59XG4gICAgICovXG4gICAgZnVuY3Rpb24gY2FuT3ZlcmZsb3coZWwsIGF4aXMpIHtcbiAgICAgIHZhciBvdmVyZmxvd1ZhbHVlID0gdy5nZXRDb21wdXRlZFN0eWxlKGVsLCBudWxsKVsnb3ZlcmZsb3cnICsgYXhpc107XG5cbiAgICAgIHJldHVybiBvdmVyZmxvd1ZhbHVlID09PSAnYXV0bycgfHwgb3ZlcmZsb3dWYWx1ZSA9PT0gJ3Njcm9sbCc7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogaW5kaWNhdGVzIGlmIGFuIGVsZW1lbnQgY2FuIGJlIHNjcm9sbGVkIGluIGVpdGhlciBheGlzXG4gICAgICogQG1ldGhvZCBpc1Njcm9sbGFibGVcbiAgICAgKiBAcGFyYW0ge05vZGV9IGVsXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IGF4aXNcbiAgICAgKiBAcmV0dXJucyB7Qm9vbGVhbn1cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBpc1Njcm9sbGFibGUoZWwpIHtcbiAgICAgIHZhciBpc1Njcm9sbGFibGVZID0gaGFzU2Nyb2xsYWJsZVNwYWNlKGVsLCAnWScpICYmIGNhbk92ZXJmbG93KGVsLCAnWScpO1xuICAgICAgdmFyIGlzU2Nyb2xsYWJsZVggPSBoYXNTY3JvbGxhYmxlU3BhY2UoZWwsICdYJykgJiYgY2FuT3ZlcmZsb3coZWwsICdYJyk7XG5cbiAgICAgIHJldHVybiBpc1Njcm9sbGFibGVZIHx8IGlzU2Nyb2xsYWJsZVg7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogZmluZHMgc2Nyb2xsYWJsZSBwYXJlbnQgb2YgYW4gZWxlbWVudFxuICAgICAqIEBtZXRob2QgZmluZFNjcm9sbGFibGVQYXJlbnRcbiAgICAgKiBAcGFyYW0ge05vZGV9IGVsXG4gICAgICogQHJldHVybnMge05vZGV9IGVsXG4gICAgICovXG4gICAgZnVuY3Rpb24gZmluZFNjcm9sbGFibGVQYXJlbnQoZWwpIHtcbiAgICAgIHZhciBpc0JvZHk7XG5cbiAgICAgIGRvIHtcbiAgICAgICAgZWwgPSBlbC5wYXJlbnROb2RlO1xuXG4gICAgICAgIGlzQm9keSA9IGVsID09PSBkLmJvZHk7XG4gICAgICB9IHdoaWxlIChpc0JvZHkgPT09IGZhbHNlICYmIGlzU2Nyb2xsYWJsZShlbCkgPT09IGZhbHNlKTtcblxuICAgICAgaXNCb2R5ID0gbnVsbDtcblxuICAgICAgcmV0dXJuIGVsO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIHNlbGYgaW52b2tlZCBmdW5jdGlvbiB0aGF0LCBnaXZlbiBhIGNvbnRleHQsIHN0ZXBzIHRocm91Z2ggc2Nyb2xsaW5nXG4gICAgICogQG1ldGhvZCBzdGVwXG4gICAgICogQHBhcmFtIHtPYmplY3R9IGNvbnRleHRcbiAgICAgKiBAcmV0dXJucyB7dW5kZWZpbmVkfVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIHN0ZXAoY29udGV4dCkge1xuICAgICAgdmFyIHRpbWUgPSBub3coKTtcbiAgICAgIHZhciB2YWx1ZTtcbiAgICAgIHZhciBjdXJyZW50WDtcbiAgICAgIHZhciBjdXJyZW50WTtcbiAgICAgIHZhciBlbGFwc2VkID0gKHRpbWUgLSBjb250ZXh0LnN0YXJ0VGltZSkgLyBTQ1JPTExfVElNRTtcblxuICAgICAgLy8gYXZvaWQgZWxhcHNlZCB0aW1lcyBoaWdoZXIgdGhhbiBvbmVcbiAgICAgIGVsYXBzZWQgPSBlbGFwc2VkID4gMSA/IDEgOiBlbGFwc2VkO1xuXG4gICAgICAvLyBhcHBseSBlYXNpbmcgdG8gZWxhcHNlZCB0aW1lXG4gICAgICB2YWx1ZSA9IGVhc2UoZWxhcHNlZCk7XG5cbiAgICAgIGN1cnJlbnRYID0gY29udGV4dC5zdGFydFggKyAoY29udGV4dC54IC0gY29udGV4dC5zdGFydFgpICogdmFsdWU7XG4gICAgICBjdXJyZW50WSA9IGNvbnRleHQuc3RhcnRZICsgKGNvbnRleHQueSAtIGNvbnRleHQuc3RhcnRZKSAqIHZhbHVlO1xuXG4gICAgICBjb250ZXh0Lm1ldGhvZC5jYWxsKGNvbnRleHQuc2Nyb2xsYWJsZSwgY3VycmVudFgsIGN1cnJlbnRZKTtcblxuICAgICAgLy8gc2Nyb2xsIG1vcmUgaWYgd2UgaGF2ZSBub3QgcmVhY2hlZCBvdXIgZGVzdGluYXRpb25cbiAgICAgIGlmIChjdXJyZW50WCAhPT0gY29udGV4dC54IHx8IGN1cnJlbnRZICE9PSBjb250ZXh0LnkpIHtcbiAgICAgICAgdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUoc3RlcC5iaW5kKHcsIGNvbnRleHQpKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBzY3JvbGxzIHdpbmRvdyBvciBlbGVtZW50IHdpdGggYSBzbW9vdGggYmVoYXZpb3JcbiAgICAgKiBAbWV0aG9kIHNtb290aFNjcm9sbFxuICAgICAqIEBwYXJhbSB7T2JqZWN0fE5vZGV9IGVsXG4gICAgICogQHBhcmFtIHtOdW1iZXJ9IHhcbiAgICAgKiBAcGFyYW0ge051bWJlcn0geVxuICAgICAqIEByZXR1cm5zIHt1bmRlZmluZWR9XG4gICAgICovXG4gICAgZnVuY3Rpb24gc21vb3RoU2Nyb2xsKGVsLCB4LCB5KSB7XG4gICAgICB2YXIgc2Nyb2xsYWJsZTtcbiAgICAgIHZhciBzdGFydFg7XG4gICAgICB2YXIgc3RhcnRZO1xuICAgICAgdmFyIG1ldGhvZDtcbiAgICAgIHZhciBzdGFydFRpbWUgPSBub3coKTtcblxuICAgICAgLy8gZGVmaW5lIHNjcm9sbCBjb250ZXh0XG4gICAgICBpZiAoZWwgPT09IGQuYm9keSkge1xuICAgICAgICBzY3JvbGxhYmxlID0gdztcbiAgICAgICAgc3RhcnRYID0gdy5zY3JvbGxYIHx8IHcucGFnZVhPZmZzZXQ7XG4gICAgICAgIHN0YXJ0WSA9IHcuc2Nyb2xsWSB8fCB3LnBhZ2VZT2Zmc2V0O1xuICAgICAgICBtZXRob2QgPSBvcmlnaW5hbC5zY3JvbGw7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBzY3JvbGxhYmxlID0gZWw7XG4gICAgICAgIHN0YXJ0WCA9IGVsLnNjcm9sbExlZnQ7XG4gICAgICAgIHN0YXJ0WSA9IGVsLnNjcm9sbFRvcDtcbiAgICAgICAgbWV0aG9kID0gc2Nyb2xsRWxlbWVudDtcbiAgICAgIH1cblxuICAgICAgLy8gc2Nyb2xsIGxvb3Bpbmcgb3ZlciBhIGZyYW1lXG4gICAgICBzdGVwKHtcbiAgICAgICAgc2Nyb2xsYWJsZTogc2Nyb2xsYWJsZSxcbiAgICAgICAgbWV0aG9kOiBtZXRob2QsXG4gICAgICAgIHN0YXJ0VGltZTogc3RhcnRUaW1lLFxuICAgICAgICBzdGFydFg6IHN0YXJ0WCxcbiAgICAgICAgc3RhcnRZOiBzdGFydFksXG4gICAgICAgIHg6IHgsXG4gICAgICAgIHk6IHlcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIC8vIE9SSUdJTkFMIE1FVEhPRFMgT1ZFUlJJREVTXG4gICAgLy8gdy5zY3JvbGwgYW5kIHcuc2Nyb2xsVG9cbiAgICB3LnNjcm9sbCA9IHcuc2Nyb2xsVG8gPSBmdW5jdGlvbigpIHtcbiAgICAgIC8vIGF2b2lkIGFjdGlvbiB3aGVuIG5vIGFyZ3VtZW50cyBhcmUgcGFzc2VkXG4gICAgICBpZiAoYXJndW1lbnRzWzBdID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICAvLyBhdm9pZCBzbW9vdGggYmVoYXZpb3IgaWYgbm90IHJlcXVpcmVkXG4gICAgICBpZiAoc2hvdWxkQmFpbE91dChhcmd1bWVudHNbMF0pID09PSB0cnVlKSB7XG4gICAgICAgIG9yaWdpbmFsLnNjcm9sbC5jYWxsKFxuICAgICAgICAgIHcsXG4gICAgICAgICAgYXJndW1lbnRzWzBdLmxlZnQgIT09IHVuZGVmaW5lZFxuICAgICAgICAgICAgPyBhcmd1bWVudHNbMF0ubGVmdFxuICAgICAgICAgICAgOiB0eXBlb2YgYXJndW1lbnRzWzBdICE9PSAnb2JqZWN0J1xuICAgICAgICAgICAgICA/IGFyZ3VtZW50c1swXVxuICAgICAgICAgICAgICA6IHcuc2Nyb2xsWCB8fCB3LnBhZ2VYT2Zmc2V0LFxuICAgICAgICAgIC8vIHVzZSB0b3AgcHJvcCwgc2Vjb25kIGFyZ3VtZW50IGlmIHByZXNlbnQgb3IgZmFsbGJhY2sgdG8gc2Nyb2xsWVxuICAgICAgICAgIGFyZ3VtZW50c1swXS50b3AgIT09IHVuZGVmaW5lZFxuICAgICAgICAgICAgPyBhcmd1bWVudHNbMF0udG9wXG4gICAgICAgICAgICA6IGFyZ3VtZW50c1sxXSAhPT0gdW5kZWZpbmVkXG4gICAgICAgICAgICAgID8gYXJndW1lbnRzWzFdXG4gICAgICAgICAgICAgIDogdy5zY3JvbGxZIHx8IHcucGFnZVlPZmZzZXRcbiAgICAgICAgKTtcblxuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIC8vIExFVCBUSEUgU01PT1RITkVTUyBCRUdJTiFcbiAgICAgIHNtb290aFNjcm9sbC5jYWxsKFxuICAgICAgICB3LFxuICAgICAgICBkLmJvZHksXG4gICAgICAgIGFyZ3VtZW50c1swXS5sZWZ0ICE9PSB1bmRlZmluZWRcbiAgICAgICAgICA/IH5+YXJndW1lbnRzWzBdLmxlZnRcbiAgICAgICAgICA6IHcuc2Nyb2xsWCB8fCB3LnBhZ2VYT2Zmc2V0LFxuICAgICAgICBhcmd1bWVudHNbMF0udG9wICE9PSB1bmRlZmluZWRcbiAgICAgICAgICA/IH5+YXJndW1lbnRzWzBdLnRvcFxuICAgICAgICAgIDogdy5zY3JvbGxZIHx8IHcucGFnZVlPZmZzZXRcbiAgICAgICk7XG4gICAgfTtcblxuICAgIC8vIHcuc2Nyb2xsQnlcbiAgICB3LnNjcm9sbEJ5ID0gZnVuY3Rpb24oKSB7XG4gICAgICAvLyBhdm9pZCBhY3Rpb24gd2hlbiBubyBhcmd1bWVudHMgYXJlIHBhc3NlZFxuICAgICAgaWYgKGFyZ3VtZW50c1swXSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgLy8gYXZvaWQgc21vb3RoIGJlaGF2aW9yIGlmIG5vdCByZXF1aXJlZFxuICAgICAgaWYgKHNob3VsZEJhaWxPdXQoYXJndW1lbnRzWzBdKSkge1xuICAgICAgICBvcmlnaW5hbC5zY3JvbGxCeS5jYWxsKFxuICAgICAgICAgIHcsXG4gICAgICAgICAgYXJndW1lbnRzWzBdLmxlZnQgIT09IHVuZGVmaW5lZFxuICAgICAgICAgICAgPyBhcmd1bWVudHNbMF0ubGVmdFxuICAgICAgICAgICAgOiB0eXBlb2YgYXJndW1lbnRzWzBdICE9PSAnb2JqZWN0JyA/IGFyZ3VtZW50c1swXSA6IDAsXG4gICAgICAgICAgYXJndW1lbnRzWzBdLnRvcCAhPT0gdW5kZWZpbmVkXG4gICAgICAgICAgICA/IGFyZ3VtZW50c1swXS50b3BcbiAgICAgICAgICAgIDogYXJndW1lbnRzWzFdICE9PSB1bmRlZmluZWQgPyBhcmd1bWVudHNbMV0gOiAwXG4gICAgICAgICk7XG5cbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICAvLyBMRVQgVEhFIFNNT09USE5FU1MgQkVHSU4hXG4gICAgICBzbW9vdGhTY3JvbGwuY2FsbChcbiAgICAgICAgdyxcbiAgICAgICAgZC5ib2R5LFxuICAgICAgICB+fmFyZ3VtZW50c1swXS5sZWZ0ICsgKHcuc2Nyb2xsWCB8fCB3LnBhZ2VYT2Zmc2V0KSxcbiAgICAgICAgfn5hcmd1bWVudHNbMF0udG9wICsgKHcuc2Nyb2xsWSB8fCB3LnBhZ2VZT2Zmc2V0KVxuICAgICAgKTtcbiAgICB9O1xuXG4gICAgLy8gRWxlbWVudC5wcm90b3R5cGUuc2Nyb2xsIGFuZCBFbGVtZW50LnByb3RvdHlwZS5zY3JvbGxUb1xuICAgIEVsZW1lbnQucHJvdG90eXBlLnNjcm9sbCA9IEVsZW1lbnQucHJvdG90eXBlLnNjcm9sbFRvID0gZnVuY3Rpb24oKSB7XG4gICAgICAvLyBhdm9pZCBhY3Rpb24gd2hlbiBubyBhcmd1bWVudHMgYXJlIHBhc3NlZFxuICAgICAgaWYgKGFyZ3VtZW50c1swXSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgLy8gYXZvaWQgc21vb3RoIGJlaGF2aW9yIGlmIG5vdCByZXF1aXJlZFxuICAgICAgaWYgKHNob3VsZEJhaWxPdXQoYXJndW1lbnRzWzBdKSA9PT0gdHJ1ZSkge1xuICAgICAgICAvLyBpZiBvbmUgbnVtYmVyIGlzIHBhc3NlZCwgdGhyb3cgZXJyb3IgdG8gbWF0Y2ggRmlyZWZveCBpbXBsZW1lbnRhdGlvblxuICAgICAgICBpZiAodHlwZW9mIGFyZ3VtZW50c1swXSA9PT0gJ251bWJlcicgJiYgYXJndW1lbnRzWzFdID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgU3ludGF4RXJyb3IoJ1ZhbHVlIGNvdWxkIG5vdCBiZSBjb252ZXJ0ZWQnKTtcbiAgICAgICAgfVxuXG4gICAgICAgIG9yaWdpbmFsLmVsZW1lbnRTY3JvbGwuY2FsbChcbiAgICAgICAgICB0aGlzLFxuICAgICAgICAgIC8vIHVzZSBsZWZ0IHByb3AsIGZpcnN0IG51bWJlciBhcmd1bWVudCBvciBmYWxsYmFjayB0byBzY3JvbGxMZWZ0XG4gICAgICAgICAgYXJndW1lbnRzWzBdLmxlZnQgIT09IHVuZGVmaW5lZFxuICAgICAgICAgICAgPyB+fmFyZ3VtZW50c1swXS5sZWZ0XG4gICAgICAgICAgICA6IHR5cGVvZiBhcmd1bWVudHNbMF0gIT09ICdvYmplY3QnID8gfn5hcmd1bWVudHNbMF0gOiB0aGlzLnNjcm9sbExlZnQsXG4gICAgICAgICAgLy8gdXNlIHRvcCBwcm9wLCBzZWNvbmQgYXJndW1lbnQgb3IgZmFsbGJhY2sgdG8gc2Nyb2xsVG9wXG4gICAgICAgICAgYXJndW1lbnRzWzBdLnRvcCAhPT0gdW5kZWZpbmVkXG4gICAgICAgICAgICA/IH5+YXJndW1lbnRzWzBdLnRvcFxuICAgICAgICAgICAgOiBhcmd1bWVudHNbMV0gIT09IHVuZGVmaW5lZCA/IH5+YXJndW1lbnRzWzFdIDogdGhpcy5zY3JvbGxUb3BcbiAgICAgICAgKTtcblxuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIHZhciBsZWZ0ID0gYXJndW1lbnRzWzBdLmxlZnQ7XG4gICAgICB2YXIgdG9wID0gYXJndW1lbnRzWzBdLnRvcDtcblxuICAgICAgLy8gTEVUIFRIRSBTTU9PVEhORVNTIEJFR0lOIVxuICAgICAgc21vb3RoU2Nyb2xsLmNhbGwoXG4gICAgICAgIHRoaXMsXG4gICAgICAgIHRoaXMsXG4gICAgICAgIHR5cGVvZiBsZWZ0ID09PSAndW5kZWZpbmVkJyA/IHRoaXMuc2Nyb2xsTGVmdCA6IH5+bGVmdCxcbiAgICAgICAgdHlwZW9mIHRvcCA9PT0gJ3VuZGVmaW5lZCcgPyB0aGlzLnNjcm9sbFRvcCA6IH5+dG9wXG4gICAgICApO1xuICAgIH07XG5cbiAgICAvLyBFbGVtZW50LnByb3RvdHlwZS5zY3JvbGxCeVxuICAgIEVsZW1lbnQucHJvdG90eXBlLnNjcm9sbEJ5ID0gZnVuY3Rpb24oKSB7XG4gICAgICAvLyBhdm9pZCBhY3Rpb24gd2hlbiBubyBhcmd1bWVudHMgYXJlIHBhc3NlZFxuICAgICAgaWYgKGFyZ3VtZW50c1swXSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgLy8gYXZvaWQgc21vb3RoIGJlaGF2aW9yIGlmIG5vdCByZXF1aXJlZFxuICAgICAgaWYgKHNob3VsZEJhaWxPdXQoYXJndW1lbnRzWzBdKSA9PT0gdHJ1ZSkge1xuICAgICAgICBvcmlnaW5hbC5lbGVtZW50U2Nyb2xsLmNhbGwoXG4gICAgICAgICAgdGhpcyxcbiAgICAgICAgICBhcmd1bWVudHNbMF0ubGVmdCAhPT0gdW5kZWZpbmVkXG4gICAgICAgICAgICA/IH5+YXJndW1lbnRzWzBdLmxlZnQgKyB0aGlzLnNjcm9sbExlZnRcbiAgICAgICAgICAgIDogfn5hcmd1bWVudHNbMF0gKyB0aGlzLnNjcm9sbExlZnQsXG4gICAgICAgICAgYXJndW1lbnRzWzBdLnRvcCAhPT0gdW5kZWZpbmVkXG4gICAgICAgICAgICA/IH5+YXJndW1lbnRzWzBdLnRvcCArIHRoaXMuc2Nyb2xsVG9wXG4gICAgICAgICAgICA6IH5+YXJndW1lbnRzWzFdICsgdGhpcy5zY3JvbGxUb3BcbiAgICAgICAgKTtcblxuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIHRoaXMuc2Nyb2xsKHtcbiAgICAgICAgbGVmdDogfn5hcmd1bWVudHNbMF0ubGVmdCArIHRoaXMuc2Nyb2xsTGVmdCxcbiAgICAgICAgdG9wOiB+fmFyZ3VtZW50c1swXS50b3AgKyB0aGlzLnNjcm9sbFRvcCxcbiAgICAgICAgYmVoYXZpb3I6IGFyZ3VtZW50c1swXS5iZWhhdmlvclxuICAgICAgfSk7XG4gICAgfTtcblxuICAgIC8vIEVsZW1lbnQucHJvdG90eXBlLnNjcm9sbEludG9WaWV3XG4gICAgRWxlbWVudC5wcm90b3R5cGUuc2Nyb2xsSW50b1ZpZXcgPSBmdW5jdGlvbigpIHtcbiAgICAgIC8vIGF2b2lkIHNtb290aCBiZWhhdmlvciBpZiBub3QgcmVxdWlyZWRcbiAgICAgIGlmIChzaG91bGRCYWlsT3V0KGFyZ3VtZW50c1swXSkgPT09IHRydWUpIHtcbiAgICAgICAgb3JpZ2luYWwuc2Nyb2xsSW50b1ZpZXcuY2FsbChcbiAgICAgICAgICB0aGlzLFxuICAgICAgICAgIGFyZ3VtZW50c1swXSA9PT0gdW5kZWZpbmVkID8gdHJ1ZSA6IGFyZ3VtZW50c1swXVxuICAgICAgICApO1xuXG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgLy8gTEVUIFRIRSBTTU9PVEhORVNTIEJFR0lOIVxuICAgICAgdmFyIHNjcm9sbGFibGVQYXJlbnQgPSBmaW5kU2Nyb2xsYWJsZVBhcmVudCh0aGlzKTtcbiAgICAgIHZhciBwYXJlbnRSZWN0cyA9IHNjcm9sbGFibGVQYXJlbnQuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG4gICAgICB2YXIgY2xpZW50UmVjdHMgPSB0aGlzLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xuXG4gICAgICBpZiAoc2Nyb2xsYWJsZVBhcmVudCAhPT0gZC5ib2R5KSB7XG4gICAgICAgIC8vIHJldmVhbCBlbGVtZW50IGluc2lkZSBwYXJlbnRcbiAgICAgICAgc21vb3RoU2Nyb2xsLmNhbGwoXG4gICAgICAgICAgdGhpcyxcbiAgICAgICAgICBzY3JvbGxhYmxlUGFyZW50LFxuICAgICAgICAgIHNjcm9sbGFibGVQYXJlbnQuc2Nyb2xsTGVmdCArIGNsaWVudFJlY3RzLmxlZnQgLSBwYXJlbnRSZWN0cy5sZWZ0LFxuICAgICAgICAgIHNjcm9sbGFibGVQYXJlbnQuc2Nyb2xsVG9wICsgY2xpZW50UmVjdHMudG9wIC0gcGFyZW50UmVjdHMudG9wXG4gICAgICAgICk7XG5cbiAgICAgICAgLy8gcmV2ZWFsIHBhcmVudCBpbiB2aWV3cG9ydCB1bmxlc3MgaXMgZml4ZWRcbiAgICAgICAgaWYgKHcuZ2V0Q29tcHV0ZWRTdHlsZShzY3JvbGxhYmxlUGFyZW50KS5wb3NpdGlvbiAhPT0gJ2ZpeGVkJykge1xuICAgICAgICAgIHcuc2Nyb2xsQnkoe1xuICAgICAgICAgICAgbGVmdDogcGFyZW50UmVjdHMubGVmdCxcbiAgICAgICAgICAgIHRvcDogcGFyZW50UmVjdHMudG9wLFxuICAgICAgICAgICAgYmVoYXZpb3I6ICdzbW9vdGgnXG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIHJldmVhbCBlbGVtZW50IGluIHZpZXdwb3J0XG4gICAgICAgIHcuc2Nyb2xsQnkoe1xuICAgICAgICAgIGxlZnQ6IGNsaWVudFJlY3RzLmxlZnQsXG4gICAgICAgICAgdG9wOiBjbGllbnRSZWN0cy50b3AsXG4gICAgICAgICAgYmVoYXZpb3I6ICdzbW9vdGgnXG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH07XG4gIH1cblxuICBpZiAodHlwZW9mIGV4cG9ydHMgPT09ICdvYmplY3QnICYmIHR5cGVvZiBtb2R1bGUgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgLy8gY29tbW9uanNcbiAgICBtb2R1bGUuZXhwb3J0cyA9IHsgcG9seWZpbGw6IHBvbHlmaWxsIH07XG4gIH0gZWxzZSB7XG4gICAgLy8gZ2xvYmFsXG4gICAgcG9seWZpbGwoKTtcbiAgfVxuXG59KCkpO1xuIiwiY29uc3QgREIgPSAnaHR0cHM6Ly9uZXh1cy1jYXRhbG9nLmZpcmViYXNlaW8uY29tL3Bvc3RzLmpzb24/YXV0aD03ZzdweUtLeWtOM041ZXdySW1oT2FTNnZ3ckZzYzVmS2tyazhlanpmJztcblxuY29uc3QgJGxvYWRpbmcgPSBBcnJheS5mcm9tKGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoJy5sb2FkaW5nJykpO1xuY29uc3QgJGFydGljbGVMaXN0ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2pzLWxpc3QnKTtcbmNvbnN0ICRuYXYgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnanMtbmF2Jyk7XG5jb25zdCAkcGFyYWxsYXggPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcucGFyYWxsYXgnKTtcbmNvbnN0ICRjb250ZW50ID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignLmNvbnRlbnQnKTtcbmNvbnN0ICR0aXRsZSA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdqcy10aXRsZScpO1xuY29uc3QgJHVwQXJyb3cgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnanMtYXJyb3cnKTtcbmNvbnN0ICRtb2RhbCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJy5tb2RhbCcpO1xuY29uc3QgJGxpZ2h0Ym94ID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignLmxpZ2h0Ym94Jyk7XG5jb25zdCAkdmlldyA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJy5saWdodGJveC12aWV3Jyk7XG5jb25zdCBzb3J0SWRzID0gWydhcnRpc3QnLCAndGl0bGUnXTtcblxuZXhwb3J0IHsgXG5cdERCLFxuXHQkbG9hZGluZyxcblx0JGFydGljbGVMaXN0LCBcblx0JG5hdiwgXG5cdCRwYXJhbGxheCxcblx0JGNvbnRlbnQsXG5cdCR0aXRsZSxcblx0JHVwQXJyb3csXG5cdCRtb2RhbCxcblx0JGxpZ2h0Ym94LFxuXHQkdmlldyxcblx0c29ydElkc1xufTsiLCJpbXBvcnQgc21vb3Roc2Nyb2xsIGZyb20gJ3Ntb290aHNjcm9sbC1wb2x5ZmlsbCc7XG5cbmltcG9ydCB7IGFydGljbGVUZW1wbGF0ZSwgcmVuZGVyTmF2TGcgfSBmcm9tICcuL3RlbXBsYXRlcyc7XG5pbXBvcnQgeyBkZWJvdW5jZSwgaGlkZUxvYWRpbmcsIHNjcm9sbFRvVG9wIH0gZnJvbSAnLi91dGlscyc7XG5pbXBvcnQgeyBEQiwgJGFydGljbGVMaXN0LCBzb3J0SWRzIH0gZnJvbSAnLi9jb25zdGFudHMnO1xuaW1wb3J0IHsgYXR0YWNoTW9kYWxMaXN0ZW5lcnMsIGF0dGFjaFVwQXJyb3dMaXN0ZW5lcnMsIGF0dGFjaEltYWdlTGlzdGVuZXJzLCBtYWtlQWxwaGFiZXQsIG1ha2VTbGlkZXIgfSBmcm9tICcuL21vZHVsZXMnO1xuXG5sZXQgc29ydEtleSA9IDA7IC8vIDAgPSBhcnRpc3QsIDEgPSB0aXRsZVxubGV0IGVudHJpZXMgPSB7IGJ5QXV0aG9yOiBbXSwgYnlUaXRsZTogW10gfTtcblxuY29uc3Qgc2V0VXBTb3J0QnV0dG9ucyA9ICgpID0+IHtcblx0c29ydElkcy5mb3JFYWNoKGlkID0+IHtcblx0XHRjb25zdCBhbHQgPSBpZCA9PT0gJ2FydGlzdCcgPyAndGl0bGUnIDogJ2FydGlzdCc7XG5cblx0XHRjb25zdCAkYnV0dG9uID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoYGpzLWJ5LSR7aWR9YCk7XG5cdFx0Y29uc3QgJGFsdEJ1dHRvbiA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKGBqcy1ieS0ke2FsdH1gKTtcblxuXHRcdCRidXR0b24uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoKSA9PiB7XG5cdFx0XHRzY3JvbGxUb1RvcCgpO1xuXHRcdFx0c29ydEtleSA9ICFzb3J0S2V5O1xuXHRcdFx0cmVuZGVyRW50cmllcygpO1xuXG5cdFx0XHQkYnV0dG9uLmNsYXNzTGlzdC5hZGQoJ2FjdGl2ZScpO1xuXHRcdFx0JGFsdEJ1dHRvbi5jbGFzc0xpc3QucmVtb3ZlKCdhY3RpdmUnKTtcblx0XHR9KVxuXHR9KTtcbn07XG5cbmNvbnN0IHJlbmRlckVudHJpZXMgPSAoKSA9PiB7XG5cdGNvbnN0IGVudHJpZXNMaXN0ID0gc29ydEtleSA/IGVudHJpZXMuYnlUaXRsZSA6IGVudHJpZXMuYnlBdXRob3I7XG5cblx0JGFydGljbGVMaXN0LmlubmVySFRNTCA9ICcnO1xuXG5cdGVudHJpZXNMaXN0LmZvckVhY2goKGVudHJ5LCBpKSA9PiB7XG5cdFx0JGFydGljbGVMaXN0Lmluc2VydEFkamFjZW50SFRNTCgnYmVmb3JlZW5kJywgYXJ0aWNsZVRlbXBsYXRlKGVudHJ5LCBpKSk7XG5cdFx0bWFrZVNsaWRlcihkb2N1bWVudC5nZXRFbGVtZW50QnlJZChgc2xpZGVyLSR7aX1gKSk7XG5cdH0pO1xuXG5cdGlmICh3aW5kb3cuc2NyZWVuLndpZHRoID4gNzY4KSBhdHRhY2hJbWFnZUxpc3RlbmVycygpO1xuXHRtYWtlQWxwaGFiZXQoc29ydEtleSk7XG59O1xuXG5jb25zdCBzZXREYXRhQW5kU29ydEJ5VGl0bGUgPSAoZGF0YSkgPT4ge1xuXHRlbnRyaWVzLmJ5QXV0aG9yID0gZGF0YTtcblx0ZW50cmllcy5ieVRpdGxlID0gZGF0YS5zbGljZSgpOyAvLyBjb3BpZXMgZGF0YSBmb3IgYnlUaXRsZSBzb3J0XG5cblx0ZW50cmllcy5ieVRpdGxlLnNvcnQoKGEsIGIpID0+IHtcblx0XHRsZXQgYVRpdGxlID0gYS50aXRsZVswXS50b1VwcGVyQ2FzZSgpO1xuXHRcdGxldCBiVGl0bGUgPSBiLnRpdGxlWzBdLnRvVXBwZXJDYXNlKCk7XG5cdFx0aWYgKGFUaXRsZSA+IGJUaXRsZSkgcmV0dXJuIDE7XG5cdFx0ZWxzZSBpZiAoYVRpdGxlIDwgYlRpdGxlKSByZXR1cm4gLTE7XG5cdFx0ZWxzZSByZXR1cm4gMDtcblx0fSk7XG59O1xuXG5jb25zdCBmZXRjaERhdGEgPSAoKSA9PiB7XG5cdGZldGNoKERCKS50aGVuKHJlcyA9PiByZXMuanNvbigpKVxuXHQudGhlbihkYXRhID0+IHtcblx0XHRzZXREYXRhQW5kU29ydEJ5VGl0bGUoZGF0YSk7XG5cdFx0cmVuZGVyRW50cmllcygpO1xuXHRcdGhpZGVMb2FkaW5nKCk7XG5cdH0pXG5cdC5jYXRjaChlcnIgPT4gY29uc29sZS53YXJuKGVycikpO1xufTtcblxuY29uc3QgaW5pdCA9ICgpID0+IHtcblx0c21vb3Roc2Nyb2xsLnBvbHlmaWxsKCk7XG5cdGZldGNoRGF0YSgpO1xuXHRyZW5kZXJOYXZMZygpO1xuXHRzZXRVcFNvcnRCdXR0b25zKCk7XG5cdGF0dGFjaFVwQXJyb3dMaXN0ZW5lcnMoKTtcblx0YXR0YWNoTW9kYWxMaXN0ZW5lcnMoKTtcbn07XG5cbmluaXQoKTtcbiIsImltcG9ydCB7ICR2aWV3LCAkbGlnaHRib3ggfSBmcm9tICcuLi9jb25zdGFudHMnO1xuXG5sZXQgbGlnaHRib3ggPSBmYWxzZTtcbmxldCB4MiA9IGZhbHNlO1xubGV0IHZpZXdDbGFzcztcblxuY29uc3QgYXR0YWNoSW1hZ2VMaXN0ZW5lcnMgPSAoKSA9PiB7XG5cdGNvbnN0ICRpbWFnZXMgPSBBcnJheS5mcm9tKGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoJy5hcnRpY2xlLWltYWdlJykpO1xuXG5cdCRpbWFnZXMuZm9yRWFjaChpbWcgPT4ge1xuXHRcdGltZy5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIChldnQpID0+IHtcblx0XHRcdGlmICghbGlnaHRib3gpIHtcblx0XHRcdFx0JGxpZ2h0Ym94LmNsYXNzTGlzdC5hZGQoJ3Nob3ctaW1nJyk7XG5cdFx0XHRcdCR2aWV3LnNyYyA9IGltZy5zcmM7XG5cdFx0XHRcdGxpZ2h0Ym94ID0gdHJ1ZTtcblx0XHRcdH1cblx0XHR9KTtcblx0fSk7XG5cblx0JGxpZ2h0Ym94LmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKGV2dCkgPT4ge1xuXHRcdGlmIChldnQudGFyZ2V0ID09PSAkdmlldykgcmV0dXJuO1xuXHRcdCRsaWdodGJveC5jbGFzc0xpc3QucmVtb3ZlKCdzaG93LWltZycpO1xuXHRcdGxpZ2h0Ym94ID0gZmFsc2U7XG5cdH0pO1xuXG5cdCR2aWV3LmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKCkgPT4ge1xuXHRcdGlmICgheDIpIHtcblx0XHRcdHZpZXdDbGFzcyA9ICR2aWV3LndpZHRoIDwgd2luZG93LmlubmVyV2lkdGggPyAndmlldy14Mi0tc20nIDogJ3ZpZXcteDInO1xuXHRcdFx0JHZpZXcuY2xhc3NMaXN0LmFkZCh2aWV3Q2xhc3MpO1xuXHRcdFx0c2V0VGltZW91dCgoKSA9PiB4MiA9IHRydWUsIDMwMCk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdCR2aWV3LmNsYXNzTGlzdC5yZW1vdmUodmlld0NsYXNzKTtcblx0XHRcdCRsaWdodGJveC5jbGFzc0xpc3QucmVtb3ZlKCdzaG93LWltZycpO1xuXHRcdFx0eDIgPSBmYWxzZTtcblx0XHRcdGxpZ2h0Ym94ID0gZmFsc2U7XG5cdFx0fVxuXHR9KTtcbn07XG5cbmV4cG9ydCBkZWZhdWx0IGF0dGFjaEltYWdlTGlzdGVuZXJzOyIsImltcG9ydCB7ICRtb2RhbCB9IGZyb20gJy4uL2NvbnN0YW50cyc7XG5cbmxldCBtb2RhbCA9IGZhbHNlO1xuY29uc3QgYXR0YWNoTW9kYWxMaXN0ZW5lcnMgPSAoKSA9PiB7XG5cdGNvbnN0ICRmaW5kID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2pzLWZpbmQnKTtcblx0XG5cdCRmaW5kLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKCkgPT4ge1xuXHRcdCRtb2RhbC5jbGFzc0xpc3QuYWRkKCdzaG93Jyk7XG5cdFx0bW9kYWwgPSB0cnVlO1xuXHR9KTtcblxuXHQkbW9kYWwuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoKSA9PiB7XG5cdFx0JG1vZGFsLmNsYXNzTGlzdC5yZW1vdmUoJ3Nob3cnKTtcblx0XHRtb2RhbCA9IGZhbHNlO1xuXHR9KTtcblxuXHR3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcigna2V5ZG93bicsICgpID0+IHtcblx0XHRpZiAobW9kYWwpIHtcblx0XHRcdHNldFRpbWVvdXQoKCkgPT4ge1xuXHRcdFx0XHQkbW9kYWwuY2xhc3NMaXN0LnJlbW92ZSgnc2hvdycpO1xuXHRcdFx0XHRtb2RhbCA9IGZhbHNlO1xuXHRcdFx0fSwgNjAwKTtcblx0XHR9O1xuXHR9KTtcbn07XG5cbmV4cG9ydCBkZWZhdWx0IGF0dGFjaE1vZGFsTGlzdGVuZXJzOyIsImltcG9ydCB7ICR0aXRsZSwgJHBhcmFsbGF4LCAkdXBBcnJvdyB9IGZyb20gJy4uL2NvbnN0YW50cyc7XG5pbXBvcnQgeyBzY3JvbGxUb1RvcCB9IGZyb20gJy4uL3V0aWxzJztcblxubGV0IHByZXY7XG5sZXQgY3VycmVudCA9IDA7XG5sZXQgaXNTaG93aW5nID0gZmFsc2U7XG5cbmNvbnN0IGF0dGFjaFVwQXJyb3dMaXN0ZW5lcnMgPSAoKSA9PiB7XG5cdCRwYXJhbGxheC5hZGRFdmVudExpc3RlbmVyKCdzY3JvbGwnLCAoKSA9PiB7XG5cdFx0bGV0IHkgPSAkdGl0bGUuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCkueTtcblxuXHRcdGlmIChjdXJyZW50ICE9PSB5KSB7XG5cdFx0XHRwcmV2ID0gY3VycmVudDtcblx0XHRcdGN1cnJlbnQgPSB5O1xuXHRcdH07XG5cblx0XHRpZiAoeSA8PSAtNTAgJiYgIWlzU2hvd2luZykge1xuXHRcdFx0JHVwQXJyb3cuY2xhc3NMaXN0LmFkZCgnc2hvdycpO1xuXHRcdFx0aXNTaG93aW5nID0gdHJ1ZTtcblx0XHR9IGVsc2UgaWYgKHkgPiAtNTAgJiYgaXNTaG93aW5nKSB7XG5cdFx0XHQkdXBBcnJvdy5jbGFzc0xpc3QucmVtb3ZlKCdzaG93Jyk7XG5cdFx0XHRpc1Nob3dpbmcgPSBmYWxzZTtcblx0XHR9XG5cdH0pO1xuXG5cdCR1cEFycm93LmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKCkgPT4gc2Nyb2xsVG9Ub3AoKSk7XG59O1xuXG5leHBvcnQgZGVmYXVsdCBhdHRhY2hVcEFycm93TGlzdGVuZXJzOyIsImltcG9ydCBhdHRhY2hNb2RhbExpc3RlbmVycyBmcm9tICcuL2F0dGFjaE1vZGFsTGlzdGVuZXJzJztcbmltcG9ydCBhdHRhY2hVcEFycm93TGlzdGVuZXJzIGZyb20gJy4vYXR0YWNoVXBBcnJvd0xpc3RlbmVycyc7XG5pbXBvcnQgYXR0YWNoSW1hZ2VMaXN0ZW5lcnMgZnJvbSAnLi9hdHRhY2hJbWFnZUxpc3RlbmVycyc7XG5pbXBvcnQgbWFrZUFscGhhYmV0IGZyb20gJy4vbWFrZUFscGhhYmV0JztcbmltcG9ydCBtYWtlU2xpZGVyIGZyb20gJy4vbWFrZVNsaWRlcic7XG5cbmV4cG9ydCB7IFxuXHRhdHRhY2hNb2RhbExpc3RlbmVycywgXG5cdGF0dGFjaFVwQXJyb3dMaXN0ZW5lcnMsXG5cdGF0dGFjaEltYWdlTGlzdGVuZXJzLFxuXHRtYWtlQWxwaGFiZXQsIFxuXHRtYWtlU2xpZGVyIFxufTsiLCJjb25zdCBhbHBoYWJldCA9IFsnYScsICdiJywgJ2MnLCAnZCcsICdlJywgJ2YnLCAnZycsICdoJywgJ2knLCAnaicsICdrJywgJ2wnLCAnbScsICduJywgJ28nLCAncCcsICdyJywgJ3MnLCAndCcsICd1JywgJ3YnLCAndycsICd5JywgJ3onXTtcblxuY29uc3QgbWFrZUFscGhhYmV0ID0gKHNvcnRLZXkpID0+IHtcblx0Y29uc3QgZmluZEZpcnN0RW50cnkgPSAoY2hhcikgPT4ge1xuXHRcdGNvbnN0IHNlbGVjdG9yID0gc29ydEtleSA/ICcuanMtZW50cnktdGl0bGUnIDogJy5qcy1lbnRyeS1hcnRpc3QnO1xuXHRcdGNvbnN0IHByZXZTZWxlY3RvciA9ICFzb3J0S2V5ID8gJy5qcy1lbnRyeS10aXRsZScgOiAnLmpzLWVudHJ5LWFydGlzdCc7XG5cblx0XHRjb25zdCAkZW50cmllcyA9IEFycmF5LmZyb20oZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbChzZWxlY3RvcikpO1xuXHRcdGNvbnN0ICRwcmV2RW50cmllcyA9IEFycmF5LmZyb20oZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbChwcmV2U2VsZWN0b3IpKTtcblxuXHRcdCRwcmV2RW50cmllcy5mb3JFYWNoKGVudHJ5ID0+IGVudHJ5LnJlbW92ZUF0dHJpYnV0ZSgnbmFtZScpKTtcblxuXHRcdHJldHVybiAkZW50cmllcy5maW5kKGVudHJ5ID0+IHtcblx0XHRcdGxldCBub2RlID0gZW50cnkubmV4dEVsZW1lbnRTaWJsaW5nO1xuXHRcdFx0cmV0dXJuIG5vZGUuaW5uZXJIVE1MWzBdID09PSBjaGFyIHx8IG5vZGUuaW5uZXJIVE1MWzBdID09PSBjaGFyLnRvVXBwZXJDYXNlKCk7XG5cdFx0fSk7XG5cdH07XG5cblx0Y29uc3QgYXR0YWNoQW5jaG9yTGlzdGVuZXIgPSAoJGFuY2hvciwgbGV0dGVyKSA9PiB7XG5cdFx0JGFuY2hvci5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsICgpID0+IHtcblx0XHRcdGNvbnN0IGxldHRlck5vZGUgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChsZXR0ZXIpO1xuXHRcdFx0bGV0IHRhcmdldDtcblxuXHRcdFx0aWYgKCFzb3J0S2V5KSB7XG5cdFx0XHRcdHRhcmdldCA9IGxldHRlciA9PT0gJ2EnID8gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2FuY2hvci10YXJnZXQnKSA6IGxldHRlck5vZGUucGFyZW50RWxlbWVudC5wYXJlbnRFbGVtZW50LnBhcmVudEVsZW1lbnQucGFyZW50RWxlbWVudC5wcmV2aW91c0VsZW1lbnRTaWJsaW5nLnF1ZXJ5U2VsZWN0b3IoJy5qcy1hcnRpY2xlLWFuY2hvci10YXJnZXQnKTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdHRhcmdldCA9IGxldHRlciA9PT0gJ2EnID8gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2FuY2hvci10YXJnZXQnKSA6IGxldHRlck5vZGUucGFyZW50RWxlbWVudC5wYXJlbnRFbGVtZW50LnBhcmVudEVsZW1lbnQucHJldmlvdXNFbGVtZW50U2libGluZy5xdWVyeVNlbGVjdG9yKCcuanMtYXJ0aWNsZS1hbmNob3ItdGFyZ2V0Jyk7XG5cdFx0XHR9O1xuXG5cdFx0XHR0YXJnZXQuc2Nyb2xsSW50b1ZpZXcoe2JlaGF2aW9yOiBcInNtb290aFwiLCBibG9jazogXCJzdGFydFwifSk7XG5cdFx0fSk7XG5cdH07XG5cblx0bGV0IGFjdGl2ZUVudHJpZXMgPSB7fTtcblx0bGV0ICRvdXRlciA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJy5hbHBoYWJldF9fbGV0dGVycycpO1xuXHQkb3V0ZXIuaW5uZXJIVE1MID0gJyc7XG5cblx0YWxwaGFiZXQuZm9yRWFjaChsZXR0ZXIgPT4ge1xuXHRcdGxldCAkZmlyc3RFbnRyeSA9IGZpbmRGaXJzdEVudHJ5KGxldHRlcik7XG5cdFx0bGV0ICRhbmNob3IgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdhJyk7XG5cblx0XHRpZiAoISRmaXJzdEVudHJ5KSByZXR1cm47XG5cblx0XHQkZmlyc3RFbnRyeS5pZCA9IGxldHRlcjtcblx0XHQkYW5jaG9yLmlubmVySFRNTCA9IGxldHRlci50b1VwcGVyQ2FzZSgpO1xuXHRcdCRhbmNob3IuY2xhc3NOYW1lID0gJ2FscGhhYmV0X19sZXR0ZXItYW5jaG9yJztcblxuXHRcdGF0dGFjaEFuY2hvckxpc3RlbmVyKCRhbmNob3IsIGxldHRlcik7XG5cdFx0JG91dGVyLmFwcGVuZENoaWxkKCRhbmNob3IpO1xuXHR9KTtcbn07XG5cbmV4cG9ydCBkZWZhdWx0IG1ha2VBbHBoYWJldDsiLCJjb25zdCBtYWtlU2xpZGVyID0gKCRzbGlkZXIpID0+IHtcblx0Y29uc3QgJGFycm93TmV4dCA9ICRzbGlkZXIucGFyZW50RWxlbWVudC5xdWVyeVNlbGVjdG9yKCcuYXJyb3ctbmV4dCcpO1xuXHRjb25zdCAkYXJyb3dQcmV2ID0gJHNsaWRlci5wYXJlbnRFbGVtZW50LnF1ZXJ5U2VsZWN0b3IoJy5hcnJvdy1wcmV2Jyk7XG5cblx0bGV0IGN1cnJlbnQgPSAkc2xpZGVyLmZpcnN0RWxlbWVudENoaWxkO1xuXHQkYXJyb3dOZXh0LmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKCkgPT4ge1xuXHRcdGNvbnN0IG5leHQgPSBjdXJyZW50Lm5leHRFbGVtZW50U2libGluZztcblx0XHRpZiAobmV4dCkge1xuXHRcdFx0bmV4dC5zY3JvbGxJbnRvVmlldyh7YmVoYXZpb3I6IFwic21vb3RoXCIsIGJsb2NrOiBcIm5lYXJlc3RcIiwgaW5saW5lOiBcImNlbnRlclwifSk7XG5cdFx0XHRjdXJyZW50ID0gbmV4dDtcblx0XHR9XG5cdH0pO1xuXG5cdCRhcnJvd1ByZXYuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoKSA9PiB7XG5cdFx0Y29uc3QgcHJldiA9IGN1cnJlbnQucHJldmlvdXNFbGVtZW50U2libGluZztcblx0XHRpZiAocHJldikge1xuXHRcdFx0cHJldi5zY3JvbGxJbnRvVmlldyh7YmVoYXZpb3I6IFwic21vb3RoXCIsIGJsb2NrOiBcIm5lYXJlc3RcIiwgaW5saW5lOiBcImNlbnRlclwifSk7XG5cdFx0XHRjdXJyZW50ID0gcHJldjtcblx0XHR9XG5cdH0pXG59O1xuXG5leHBvcnQgZGVmYXVsdCBtYWtlU2xpZGVyOyIsImNvbnN0IGltYWdlVGVtcGxhdGUgPSAoaW1hZ2UpID0+IGBcbjxkaXYgY2xhc3M9XCJhcnRpY2xlLWltYWdlX19vdXRlclwiPlxuXHQ8aW1nIGNsYXNzPVwiYXJ0aWNsZS1pbWFnZVwiIHNyYz1cIi4uLy4uL2Fzc2V0cy9pbWFnZXMvJHtpbWFnZX1cIj48L2ltZz5cbjwvZGl2PlxuYDtcblxuY29uc3QgYXJ0aWNsZVRlbXBsYXRlID0gKGVudHJ5LCBpKSA9PiB7XG5cdGNvbnN0IHsgdGl0bGUsIGZpcnN0TmFtZSwgbGFzdE5hbWUsIGltYWdlcywgZGVzY3JpcHRpb24sIGNvbnRlbnRzLCBkaW1lbnNpb25zLCB5ZWFyLCBpc2JuLCBvY2xjLCBsaW5rIH0gPSBlbnRyeTtcblxuXHRjb25zdCBpbWFnZUhUTUwgPSBpbWFnZXMubGVuZ3RoID8gXG5cdFx0aW1hZ2VzLm1hcChpbWFnZSA9PiBpbWFnZVRlbXBsYXRlKGltYWdlKSkuam9pbignJykgOiAnJztcblxuXHRyZXR1cm4gIGBcblx0XHQ8YXJ0aWNsZSBjbGFzcz1cImFydGljbGVfX291dGVyXCI+XG5cdFx0XHQ8ZGl2IGNsYXNzPVwiYXJ0aWNsZV9faW5uZXJcIj5cblx0XHRcdFx0PGRpdiBjbGFzcz1cImFydGljbGVfX2hlYWRpbmdcIj5cblx0XHRcdFx0XHQ8YSBjbGFzcz1cImpzLWVudHJ5LXRpdGxlXCI+PC9hPlxuXHRcdFx0XHRcdDxoMiBjbGFzcz1cImFydGljbGUtaGVhZGluZ19fdGl0bGVcIj4ke3RpdGxlfTwvaDI+XG5cdFx0XHRcdFx0PGRpdiBjbGFzcz1cImFydGljbGUtaGVhZGluZ19fbmFtZVwiPlxuXHRcdFx0XHRcdFx0PHNwYW4gY2xhc3M9XCJhcnRpY2xlLWhlYWRpbmdfX25hbWUtLWZpcnN0XCI+JHtmaXJzdE5hbWV9PC9zcGFuPlxuXHRcdFx0XHRcdFx0PGEgY2xhc3M9XCJqcy1lbnRyeS1hcnRpc3RcIj48L2E+XG5cdFx0XHRcdFx0XHQ8c3BhbiBjbGFzcz1cImFydGljbGUtaGVhZGluZ19fbmFtZS0tbGFzdFwiPiR7bGFzdE5hbWV9PC9zcGFuPlxuXHRcdFx0XHRcdDwvZGl2PlxuXHRcdFx0XHQ8L2Rpdj5cdFxuXHRcdFx0XHQ8ZGl2IGNsYXNzPVwiYXJ0aWNsZV9fc2xpZGVyLW91dGVyXCI+XG5cdFx0XHRcdFx0PGRpdiBjbGFzcz1cImFydGljbGVfX3NsaWRlci1pbm5lclwiIGlkPVwic2xpZGVyLSR7aX1cIj5cblx0XHRcdFx0XHRcdCR7aW1hZ2VIVE1MfVxuXHRcdFx0XHRcdFx0PGRpdiBjbGFzcz1cImFydGljbGUtZGVzY3JpcHRpb25fX291dGVyXCI+XG5cdFx0XHRcdFx0XHRcdDxkaXYgY2xhc3M9XCJhcnRpY2xlLWRlc2NyaXB0aW9uXCI+JHtkZXNjcmlwdGlvbn08L2Rpdj5cblx0XHRcdFx0XHRcdFx0PGRpdiBjbGFzcz1cImFydGljbGUtZGV0YWlsXCI+JHtjb250ZW50c308L2Rpdj5cblx0XHRcdFx0XHRcdFx0PGRpdiBjbGFzcz1cImFydGljbGUtZGV0YWlsIGFydGljbGUtZGV0YWlsLS1tYXJnaW5cIj4ke2RpbWVuc2lvbnN9PC9kaXY+XG5cdFx0XHRcdFx0XHRcdDxkaXYgY2xhc3M9XCJhcnRpY2xlLWRldGFpbCBhcnRpY2xlLWRldGFpbC0tbWFyZ2luXCI+JHt5ZWFyfTwvZGl2PlxuXHRcdFx0XHRcdFx0XHQ8ZGl2IGNsYXNzPVwiYXJ0aWNsZS1kZXRhaWwgYXJ0aWNsZS1kZXRhaWwtLW1hcmdpblwiPiR7aXNibn08L2Rpdj5cblx0XHRcdFx0XHRcdFx0PGRpdiBjbGFzcz1cImFydGljbGUtZGV0YWlsXCI+T0NMQyA8YSBjbGFzcz1cImFydGljbGUtZGV0YWlsLS1saW5rXCIgdGFyZ2V0PVwiX2JsYW5rXCIgaHJlZj1cIiR7bGlua31cIj4ke29jbGN9PC9hPjwvZGl2PlxuXHRcdFx0XHRcdFx0PC9kaXY+XG5cdFx0XHRcdFx0PC9kaXY+XG5cdFx0XHRcdFx0PGRpdiBjbGFzcz1cImFydGljbGVfX3Njcm9sbC1jb250cm9sc1wiPlxuXHRcdFx0XHRcdFx0PHNwYW4gY2xhc3M9XCJjb250cm9scyBhcnJvdy1wcmV2XCI+4oaQPC9zcGFuPiBcblx0XHRcdFx0XHRcdDxzcGFuIGNsYXNzPVwiY29udHJvbHMgYXJyb3ctbmV4dFwiPuKGkjwvc3Bhbj5cblx0XHRcdFx0XHQ8L2Rpdj5cblx0XHRcdFx0XHQ8cCBjbGFzcz1cImpzLWFydGljbGUtYW5jaG9yLXRhcmdldFwiPjwvcD5cblx0XHRcdDwvZGl2PlxuXHRcdDwvYXJ0aWNsZT5cblx0YFxufTtcblxuZXhwb3J0IGRlZmF1bHQgYXJ0aWNsZVRlbXBsYXRlOyIsImltcG9ydCBhcnRpY2xlVGVtcGxhdGUgZnJvbSAnLi9hcnRpY2xlJztcbmltcG9ydCByZW5kZXJOYXZMZyBmcm9tICcuL25hdkxnJztcblxuZXhwb3J0IHsgYXJ0aWNsZVRlbXBsYXRlLCByZW5kZXJOYXZMZyB9OyIsImNvbnN0IHRlbXBsYXRlID0gXG5cdGA8ZGl2IGNsYXNzPVwibmF2X19pbm5lclwiPlxuXHRcdDxkaXYgY2xhc3M9XCJuYXZfX3NvcnQtYnlcIj5cblx0XHRcdDxzcGFuIGNsYXNzPVwic29ydC1ieV9fdGl0bGVcIj5Tb3J0IGJ5PC9zcGFuPlxuXHRcdFx0PGJ1dHRvbiBjbGFzcz1cInNvcnQtYnkgc29ydC1ieV9fYnktYXJ0aXN0IGFjdGl2ZVwiIGlkPVwianMtYnktYXJ0aXN0XCI+QXJ0aXN0PC9idXR0b24+XG5cdFx0XHQ8c3BhbiBjbGFzcz1cInNvcnQtYnlfX2RpdmlkZXJcIj4gfCA8L3NwYW4+XG5cdFx0XHQ8YnV0dG9uIGNsYXNzPVwic29ydC1ieSBzb3J0LWJ5X19ieS10aXRsZVwiIGlkPVwianMtYnktdGl0bGVcIj5UaXRsZTwvYnV0dG9uPlxuXHRcdFx0PHNwYW4gY2xhc3M9XCJmaW5kXCIgaWQ9XCJqcy1maW5kXCI+XG5cdFx0XHRcdCg8c3BhbiBjbGFzcz1cImZpbmQtLWlubmVyXCI+JiM4OTg0O0Y8L3NwYW4+KVxuXHRcdFx0PC9zcGFuPlxuXHRcdDwvZGl2PlxuXHRcdDxkaXYgY2xhc3M9XCJuYXZfX2FscGhhYmV0XCI+XG5cdFx0XHQ8c3BhbiBjbGFzcz1cImFscGhhYmV0X190aXRsZVwiPkdvIHRvPC9zcGFuPlxuXHRcdFx0PGRpdiBjbGFzcz1cImFscGhhYmV0X19sZXR0ZXJzXCI+PC9kaXY+XG5cdFx0PC9kaXY+XG5cdDwvZGl2PmA7XG5cbmNvbnN0IHJlbmRlck5hdkxnID0gKCkgPT4ge1xuXHRsZXQgbmF2T3V0ZXIgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnanMtbmF2Jyk7XG5cdG5hdk91dGVyLmlubmVySFRNTCA9IHRlbXBsYXRlO1xufTtcblxuZXhwb3J0IGRlZmF1bHQgcmVuZGVyTmF2TGc7IiwiaW1wb3J0IHsgJGxvYWRpbmcsICRuYXYsICRwYXJhbGxheCwgJGNvbnRlbnQsICR0aXRsZSwgJGFycm93LCAkbW9kYWwsICRsaWdodGJveCwgJHZpZXcgfSBmcm9tICcuLi9jb25zdGFudHMnO1xuXG5jb25zdCBkZWJvdW5jZSA9IChmbiwgdGltZSkgPT4ge1xuICBsZXQgdGltZW91dDtcblxuICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgY29uc3QgZnVuY3Rpb25DYWxsID0gKCkgPT4gZm4uYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICBcbiAgICBjbGVhclRpbWVvdXQodGltZW91dCk7XG4gICAgdGltZW91dCA9IHNldFRpbWVvdXQoZnVuY3Rpb25DYWxsLCB0aW1lKTtcbiAgfVxufTtcblxuY29uc3QgaGlkZUxvYWRpbmcgPSAoKSA9PiB7XG5cdCRsb2FkaW5nLmZvckVhY2goZWxlbSA9PiBlbGVtLmNsYXNzTGlzdC5hZGQoJ3JlYWR5JykpO1xuXHQkbmF2LmNsYXNzTGlzdC5hZGQoJ3JlYWR5Jyk7XG59O1xuXG5jb25zdCBzY3JvbGxUb1RvcCA9ICgpID0+IHtcblx0bGV0IHRvcCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdhbmNob3ItdGFyZ2V0Jyk7XG5cdHRvcC5zY3JvbGxJbnRvVmlldyh7YmVoYXZpb3I6IFwic21vb3RoXCIsIGJsb2NrOiBcInN0YXJ0XCJ9KTtcbn07XG5cbmV4cG9ydCB7IGRlYm91bmNlLCBoaWRlTG9hZGluZywgc2Nyb2xsVG9Ub3AgfTsiXSwicHJlRXhpc3RpbmdDb21tZW50IjoiLy8jIHNvdXJjZU1hcHBpbmdVUkw9ZGF0YTphcHBsaWNhdGlvbi9qc29uO2NoYXJzZXQ9dXRmLTg7YmFzZTY0LGV5SjJaWEp6YVc5dUlqb3pMQ0p6YjNWeVkyVnpJanBiSW01dlpHVmZiVzlrZFd4bGN5OWljbTkzYzJWeUxYQmhZMnN2WDNCeVpXeDFaR1V1YW5NaUxDSnViMlJsWDIxdlpIVnNaWE12YzIxdmIzUm9jMk55YjJ4c0xYQnZiSGxtYVd4c0wyUnBjM1F2YzIxdmIzUm9jMk55YjJ4c0xtcHpJaXdpYzNKakwycHpMMk52Ym5OMFlXNTBjeTVxY3lJc0luTnlZeTlxY3k5cGJtUmxlQzVxY3lJc0luTnlZeTlxY3k5dGIyUjFiR1Z6TDJGMGRHRmphRWx0WVdkbFRHbHpkR1Z1WlhKekxtcHpJaXdpYzNKakwycHpMMjF2WkhWc1pYTXZZWFIwWVdOb1RXOWtZV3hNYVhOMFpXNWxjbk11YW5NaUxDSnpjbU12YW5NdmJXOWtkV3hsY3k5aGRIUmhZMmhWY0VGeWNtOTNUR2x6ZEdWdVpYSnpMbXB6SWl3aWMzSmpMMnB6TDIxdlpIVnNaWE12YVc1a1pYZ3Vhbk1pTENKemNtTXZhbk12Ylc5a2RXeGxjeTl0WVd0bFFXeHdhR0ZpWlhRdWFuTWlMQ0p6Y21NdmFuTXZiVzlrZFd4bGN5OXRZV3RsVTJ4cFpHVnlMbXB6SWl3aWMzSmpMMnB6TDNSbGJYQnNZWFJsY3k5aGNuUnBZMnhsTG1weklpd2ljM0pqTDJwekwzUmxiWEJzWVhSbGN5OXBibVJsZUM1cWN5SXNJbk55WXk5cWN5OTBaVzF3YkdGMFpYTXZibUYyVEdjdWFuTWlMQ0p6Y21NdmFuTXZkWFJwYkhNdmFXNWtaWGd1YW5NaVhTd2libUZ0WlhNaU9sdGRMQ0p0WVhCd2FXNW5jeUk2SWtGQlFVRTdRVU5CUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CT3pzN096czdPMEZEZG1KQkxFbEJRVTBzUzBGQlN5d3JSa0ZCV0RzN1FVRkZRU3hKUVVGTkxGZEJRVmNzVFVGQlRTeEpRVUZPTEVOQlFWY3NVMEZCVXl4blFrRkJWQ3hEUVVFd1FpeFZRVUV4UWl4RFFVRllMRU5CUVdwQ08wRkJRMEVzU1VGQlRTeGxRVUZsTEZOQlFWTXNZMEZCVkN4RFFVRjNRaXhUUVVGNFFpeERRVUZ5UWp0QlFVTkJMRWxCUVUwc1QwRkJUeXhUUVVGVExHTkJRVlFzUTBGQmQwSXNVVUZCZUVJc1EwRkJZanRCUVVOQkxFbEJRVTBzV1VGQldTeFRRVUZUTEdGQlFWUXNRMEZCZFVJc1YwRkJka0lzUTBGQmJFSTdRVUZEUVN4SlFVRk5MRmRCUVZjc1UwRkJVeXhoUVVGVUxFTkJRWFZDTEZWQlFYWkNMRU5CUVdwQ08wRkJRMEVzU1VGQlRTeFRRVUZUTEZOQlFWTXNZMEZCVkN4RFFVRjNRaXhWUVVGNFFpeERRVUZtTzBGQlEwRXNTVUZCVFN4WFFVRlhMRk5CUVZNc1kwRkJWQ3hEUVVGM1FpeFZRVUY0UWl4RFFVRnFRanRCUVVOQkxFbEJRVTBzVTBGQlV5eFRRVUZUTEdGQlFWUXNRMEZCZFVJc1VVRkJka0lzUTBGQlpqdEJRVU5CTEVsQlFVMHNXVUZCV1N4VFFVRlRMR0ZCUVZRc1EwRkJkVUlzVjBGQmRrSXNRMEZCYkVJN1FVRkRRU3hKUVVGTkxGRkJRVkVzVTBGQlV5eGhRVUZVTEVOQlFYVkNMR2RDUVVGMlFpeERRVUZrTzBGQlEwRXNTVUZCVFN4VlFVRlZMRU5CUVVNc1VVRkJSQ3hGUVVGWExFOUJRVmdzUTBGQmFFSTdPMUZCUjBNc1JTeEhRVUZCTEVVN1VVRkRRU3hSTEVkQlFVRXNVVHRSUVVOQkxGa3NSMEZCUVN4Wk8xRkJRMEVzU1N4SFFVRkJMRWs3VVVGRFFTeFRMRWRCUVVFc1V6dFJRVU5CTEZFc1IwRkJRU3hSTzFGQlEwRXNUU3hIUVVGQkxFMDdVVUZEUVN4UkxFZEJRVUVzVVR0UlFVTkJMRTBzUjBGQlFTeE5PMUZCUTBFc1V5eEhRVUZCTEZNN1VVRkRRU3hMTEVkQlFVRXNTenRSUVVOQkxFOHNSMEZCUVN4UE96czdPenRCUXpGQ1JEczdPenRCUVVWQk96dEJRVU5CT3p0QlFVTkJPenRCUVVOQk96czdPMEZCUlVFc1NVRkJTU3hWUVVGVkxFTkJRV1FzUXl4RFFVRnBRanRCUVVOcVFpeEpRVUZKTEZWQlFWVXNSVUZCUlN4VlFVRlZMRVZCUVZvc1JVRkJaMElzVTBGQlV5eEZRVUY2UWl4RlFVRmtPenRCUVVWQkxFbEJRVTBzYlVKQlFXMUNMRk5CUVc1Q0xHZENRVUZ0UWl4SFFVRk5PMEZCUXpsQ0xHOUNRVUZSTEU5QlFWSXNRMEZCWjBJc1kwRkJUVHRCUVVOeVFpeE5RVUZOTEUxQlFVMHNUMEZCVHl4UlFVRlFMRWRCUVd0Q0xFOUJRV3hDTEVkQlFUUkNMRkZCUVhoRE96dEJRVVZCTEUxQlFVMHNWVUZCVlN4VFFVRlRMR05CUVZRc1dVRkJhVU1zUlVGQmFrTXNRMEZCYUVJN1FVRkRRU3hOUVVGTkxHRkJRV0VzVTBGQlV5eGpRVUZVTEZsQlFXbERMRWRCUVdwRExFTkJRVzVDT3p0QlFVVkJMRlZCUVZFc1owSkJRVklzUTBGQmVVSXNUMEZCZWtJc1JVRkJhME1zV1VGQlRUdEJRVU4yUXp0QlFVTkJMR0ZCUVZVc1EwRkJReXhQUVVGWU8wRkJRMEU3TzBGQlJVRXNWMEZCVVN4VFFVRlNMRU5CUVd0Q0xFZEJRV3hDTEVOQlFYTkNMRkZCUVhSQ08wRkJRMEVzWTBGQlZ5eFRRVUZZTEVOQlFYRkNMRTFCUVhKQ0xFTkJRVFJDTEZGQlFUVkNPMEZCUTBFc1IwRlFSRHRCUVZGQkxFVkJaRVE3UVVGbFFTeERRV2hDUkRzN1FVRnJRa0VzU1VGQlRTeG5Ra0ZCWjBJc1UwRkJhRUlzWVVGQlowSXNSMEZCVFR0QlFVTXpRaXhMUVVGTkxHTkJRV01zVlVGQlZTeFJRVUZSTEU5QlFXeENMRWRCUVRSQ0xGRkJRVkVzVVVGQmVFUTdPMEZCUlVFc2VVSkJRV0VzVTBGQllpeEhRVUY1UWl4RlFVRjZRanM3UVVGRlFTeGhRVUZaTEU5QlFWb3NRMEZCYjBJc1ZVRkJReXhMUVVGRUxFVkJRVkVzUTBGQlVpeEZRVUZqTzBGQlEycERMREJDUVVGaExHdENRVUZpTEVOQlFXZERMRmRCUVdoRExFVkJRVFpETEdkRFFVRm5RaXhMUVVGb1FpeEZRVUYxUWl4RFFVRjJRaXhEUVVFM1F6dEJRVU5CTERKQ1FVRlhMRk5CUVZNc1kwRkJWQ3hoUVVGclF5eERRVUZzUXl4RFFVRllPMEZCUTBFc1JVRklSRHM3UVVGTFFTeExRVUZKTEU5QlFVOHNUVUZCVUN4RFFVRmpMRXRCUVdRc1IwRkJjMElzUjBGQk1VSXNSVUZCSzBJN1FVRkRMMElzTkVKQlFXRXNUMEZCWWp0QlFVTkJMRU5CV2tRN08wRkJZMEVzU1VGQlRTeDNRa0ZCZDBJc1UwRkJlRUlzY1VKQlFYZENMRU5CUVVNc1NVRkJSQ3hGUVVGVk8wRkJRM1pETEZOQlFWRXNVVUZCVWl4SFFVRnRRaXhKUVVGdVFqdEJRVU5CTEZOQlFWRXNUMEZCVWl4SFFVRnJRaXhMUVVGTExFdEJRVXdzUlVGQmJFSXNRMEZHZFVNc1EwRkZVRHM3UVVGRmFFTXNVMEZCVVN4UFFVRlNMRU5CUVdkQ0xFbEJRV2hDTEVOQlFYRkNMRlZCUVVNc1EwRkJSQ3hGUVVGSkxFTkJRVW9zUlVGQlZUdEJRVU01UWl4TlFVRkpMRk5CUVZNc1JVRkJSU3hMUVVGR0xFTkJRVkVzUTBGQlVpeEZRVUZYTEZkQlFWZ3NSVUZCWWp0QlFVTkJMRTFCUVVrc1UwRkJVeXhGUVVGRkxFdEJRVVlzUTBGQlVTeERRVUZTTEVWQlFWY3NWMEZCV0N4RlFVRmlPMEZCUTBFc1RVRkJTU3hUUVVGVExFMUJRV0lzUlVGQmNVSXNUMEZCVHl4RFFVRlFMRU5CUVhKQ0xFdEJRMHNzU1VGQlNTeFRRVUZUTEUxQlFXSXNSVUZCY1VJc1QwRkJUeXhEUVVGRExFTkJRVklzUTBGQmNrSXNTMEZEUVN4UFFVRlBMRU5CUVZBN1FVRkRUQ3hGUVU1RU8wRkJUMEVzUTBGWVJEczdRVUZoUVN4SlFVRk5MRmxCUVZrc1UwRkJXaXhUUVVGWkxFZEJRVTA3UVVGRGRrSXNUMEZCVFN4aFFVRk9MRVZCUVZVc1NVRkJWaXhEUVVGbE8wRkJRVUVzVTBGQlR5eEpRVUZKTEVsQlFVb3NSVUZCVUR0QlFVRkJMRVZCUVdZc1JVRkRReXhKUVVSRUxFTkJRMDBzWjBKQlFWRTdRVUZEWWl4M1FrRkJjMElzU1VGQmRFSTdRVUZEUVR0QlFVTkJPMEZCUTBFc1JVRk1SQ3hGUVUxRExFdEJUa1FzUTBGTlR6dEJRVUZCTEZOQlFVOHNVVUZCVVN4SlFVRlNMRU5CUVdFc1IwRkJZaXhEUVVGUU8wRkJRVUVzUlVGT1VEdEJRVTlCTEVOQlVrUTdPMEZCVlVFc1NVRkJUU3hQUVVGUExGTkJRVkFzU1VGQlR5eEhRVUZOTzBGQlEyeENMR2REUVVGaExGRkJRV0k3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFc1EwRlFSRHM3UVVGVFFUczdPenM3T3pzN08wRkRNVVZCT3p0QlFVVkJMRWxCUVVrc1YwRkJWeXhMUVVGbU8wRkJRMEVzU1VGQlNTeExRVUZMTEV0QlFWUTdRVUZEUVN4SlFVRkpMR3RDUVVGS096dEJRVVZCTEVsQlFVMHNkVUpCUVhWQ0xGTkJRWFpDTEc5Q1FVRjFRaXhIUVVGTk8wRkJRMnhETEV0QlFVMHNWVUZCVlN4TlFVRk5MRWxCUVU0c1EwRkJWeXhUUVVGVExHZENRVUZVTEVOQlFUQkNMR2RDUVVFeFFpeERRVUZZTEVOQlFXaENPenRCUVVWQkxGTkJRVkVzVDBGQlVpeERRVUZuUWl4bFFVRlBPMEZCUTNSQ0xFMUJRVWtzWjBKQlFVb3NRMEZCY1VJc1QwRkJja0lzUlVGQk9FSXNWVUZCUXl4SFFVRkVMRVZCUVZNN1FVRkRkRU1zVDBGQlNTeERRVUZETEZGQlFVd3NSVUZCWlR0QlFVTmtMSGxDUVVGVkxGTkJRVllzUTBGQmIwSXNSMEZCY0VJc1EwRkJkMElzVlVGQmVFSTdRVUZEUVN4eFFrRkJUU3hIUVVGT0xFZEJRVmtzU1VGQlNTeEhRVUZvUWp0QlFVTkJMR1ZCUVZjc1NVRkJXRHRCUVVOQk8wRkJRMFFzUjBGT1JEdEJRVTlCTEVWQlVrUTdPMEZCVlVFc2MwSkJRVlVzWjBKQlFWWXNRMEZCTWtJc1QwRkJNMElzUlVGQmIwTXNWVUZCUXl4SFFVRkVMRVZCUVZNN1FVRkROVU1zVFVGQlNTeEpRVUZKTEUxQlFVb3NTMEZCWlN4blFrRkJia0lzUlVGQk1FSTdRVUZETVVJc2RVSkJRVlVzVTBGQlZpeERRVUZ2UWl4TlFVRndRaXhEUVVFeVFpeFZRVUV6UWp0QlFVTkJMR0ZCUVZjc1MwRkJXRHRCUVVOQkxFVkJTa1E3TzBGQlRVRXNhMEpCUVUwc1owSkJRVTRzUTBGQmRVSXNUMEZCZGtJc1JVRkJaME1zV1VGQlRUdEJRVU55UXl4TlFVRkpMRU5CUVVNc1JVRkJUQ3hGUVVGVE8wRkJRMUlzWlVGQldTeHBRa0ZCVFN4TFFVRk9MRWRCUVdNc1QwRkJUeXhWUVVGeVFpeEhRVUZyUXl4aFFVRnNReXhIUVVGclJDeFRRVUU1UkR0QlFVTkJMRzlDUVVGTkxGTkJRVTRzUTBGQlowSXNSMEZCYUVJc1EwRkJiMElzVTBGQmNFSTdRVUZEUVN4alFVRlhPMEZCUVVFc1YwRkJUU3hMUVVGTExFbEJRVmc3UVVGQlFTeEpRVUZZTEVWQlFUUkNMRWRCUVRWQ08wRkJRMEVzUjBGS1JDeE5RVWxQTzBGQlEwNHNiMEpCUVUwc1UwRkJUaXhEUVVGblFpeE5RVUZvUWl4RFFVRjFRaXhUUVVGMlFqdEJRVU5CTEhkQ1FVRlZMRk5CUVZZc1EwRkJiMElzVFVGQmNFSXNRMEZCTWtJc1ZVRkJNMEk3UVVGRFFTeFJRVUZMTEV0QlFVdzdRVUZEUVN4alFVRlhMRXRCUVZnN1FVRkRRVHRCUVVORUxFVkJXRVE3UVVGWlFTeERRUzlDUkRzN2EwSkJhVU5sTEc5Q096czdPenM3T3pzN1FVTjJRMlk3TzBGQlJVRXNTVUZCU1N4UlFVRlJMRXRCUVZvN1FVRkRRU3hKUVVGTkxIVkNRVUYxUWl4VFFVRjJRaXh2UWtGQmRVSXNSMEZCVFR0QlFVTnNReXhMUVVGTkxGRkJRVkVzVTBGQlV5eGpRVUZVTEVOQlFYZENMRk5CUVhoQ0xFTkJRV1E3TzBGQlJVRXNUMEZCVFN4blFrRkJUaXhEUVVGMVFpeFBRVUYyUWl4RlFVRm5ReXhaUVVGTk8wRkJRM0pETEc5Q1FVRlBMRk5CUVZBc1EwRkJhVUlzUjBGQmFrSXNRMEZCY1VJc1RVRkJja0k3UVVGRFFTeFZRVUZSTEVsQlFWSTdRVUZEUVN4RlFVaEVPenRCUVV0QkxHMUNRVUZQTEdkQ1FVRlFMRU5CUVhkQ0xFOUJRWGhDTEVWQlFXbERMRmxCUVUwN1FVRkRkRU1zYjBKQlFVOHNVMEZCVUN4RFFVRnBRaXhOUVVGcVFpeERRVUYzUWl4TlFVRjRRanRCUVVOQkxGVkJRVkVzUzBGQlVqdEJRVU5CTEVWQlNFUTdPMEZCUzBFc1VVRkJUeXhuUWtGQlVDeERRVUYzUWl4VFFVRjRRaXhGUVVGdFF5eFpRVUZOTzBGQlEzaERMRTFCUVVrc1MwRkJTaXhGUVVGWE8wRkJRMVlzWTBGQlZ5eFpRVUZOTzBGQlEyaENMSE5DUVVGUExGTkJRVkFzUTBGQmFVSXNUVUZCYWtJc1EwRkJkMElzVFVGQmVFSTdRVUZEUVN4WlFVRlJMRXRCUVZJN1FVRkRRU3hKUVVoRUxFVkJSMGNzUjBGSVNEdEJRVWxCTzBGQlEwUXNSVUZRUkR0QlFWRkJMRU5CY2tKRU96dHJRa0YxUW1Vc2IwSTdPenM3T3pzN096dEJRekZDWmpzN1FVRkRRVHM3UVVGRlFTeEpRVUZKTEdGQlFVbzdRVUZEUVN4SlFVRkpMRlZCUVZVc1EwRkJaRHRCUVVOQkxFbEJRVWtzV1VGQldTeExRVUZvUWpzN1FVRkZRU3hKUVVGTkxIbENRVUY1UWl4VFFVRjZRaXh6UWtGQmVVSXNSMEZCVFR0QlFVTndReXh6UWtGQlZTeG5Ra0ZCVml4RFFVRXlRaXhSUVVFelFpeEZRVUZ4UXl4WlFVRk5PMEZCUXpGRExFMUJRVWtzU1VGQlNTeHJRa0ZCVHl4eFFrRkJVQ3hIUVVFclFpeERRVUYyUXpzN1FVRkZRU3hOUVVGSkxGbEJRVmtzUTBGQmFFSXNSVUZCYlVJN1FVRkRiRUlzVlVGQlR5eFBRVUZRTzBGQlEwRXNZVUZCVlN4RFFVRldPMEZCUTBFN08wRkJSVVFzVFVGQlNTeExRVUZMTEVOQlFVTXNSVUZCVGl4SlFVRlpMRU5CUVVNc1UwRkJha0lzUlVGQk5FSTdRVUZETTBJc2RVSkJRVk1zVTBGQlZDeERRVUZ0UWl4SFFVRnVRaXhEUVVGMVFpeE5RVUYyUWp0QlFVTkJMR1ZCUVZrc1NVRkJXanRCUVVOQkxFZEJTRVFzVFVGSFR5eEpRVUZKTEVsQlFVa3NRMEZCUXl4RlFVRk1MRWxCUVZjc1UwRkJaaXhGUVVFd1FqdEJRVU5vUXl4MVFrRkJVeXhUUVVGVUxFTkJRVzFDTEUxQlFXNUNMRU5CUVRCQ0xFMUJRVEZDTzBGQlEwRXNaVUZCV1N4TFFVRmFPMEZCUTBFN1FVRkRSQ3hGUVdaRU96dEJRV2xDUVN4eFFrRkJVeXhuUWtGQlZDeERRVUV3UWl4UFFVRXhRaXhGUVVGdFF6dEJRVUZCTEZOQlFVMHNlVUpCUVU0N1FVRkJRU3hGUVVGdVF6dEJRVU5CTEVOQmJrSkVPenRyUWtGeFFtVXNjMEk3T3pzN096czdPenM3UVVNMVFtWTdPenM3UVVGRFFUczdPenRCUVVOQk96czdPMEZCUTBFN096czdRVUZEUVRzN096czdPMUZCUjBNc2IwSXNSMEZCUVN3NFFqdFJRVU5CTEhOQ0xFZEJRVUVzWjBNN1VVRkRRU3h2UWl4SFFVRkJMRGhDTzFGQlEwRXNXU3hIUVVGQkxITkNPMUZCUTBFc1ZTeEhRVUZCTEc5Q096czdPenM3T3p0QlExaEVMRWxCUVUwc1YwRkJWeXhEUVVGRExFZEJRVVFzUlVGQlRTeEhRVUZPTEVWQlFWY3NSMEZCV0N4RlFVRm5RaXhIUVVGb1FpeEZRVUZ4UWl4SFFVRnlRaXhGUVVFd1FpeEhRVUV4UWl4RlFVRXJRaXhIUVVFdlFpeEZRVUZ2UXl4SFFVRndReXhGUVVGNVF5eEhRVUY2UXl4RlFVRTRReXhIUVVFNVF5eEZRVUZ0UkN4SFFVRnVSQ3hGUVVGM1JDeEhRVUY0UkN4RlFVRTJSQ3hIUVVFM1JDeEZRVUZyUlN4SFFVRnNSU3hGUVVGMVJTeEhRVUYyUlN4RlFVRTBSU3hIUVVFMVJTeEZRVUZwUml4SFFVRnFSaXhGUVVGelJpeEhRVUYwUml4RlFVRXlSaXhIUVVFelJpeEZRVUZuUnl4SFFVRm9SeXhGUVVGeFJ5eEhRVUZ5Unl4RlFVRXdSeXhIUVVFeFJ5eEZRVUVyUnl4SFFVRXZSeXhGUVVGdlNDeEhRVUZ3U0N4RFFVRnFRanM3UVVGRlFTeEpRVUZOTEdWQlFXVXNVMEZCWml4WlFVRmxMRU5CUVVNc1QwRkJSQ3hGUVVGaE8wRkJRMnBETEV0QlFVMHNhVUpCUVdsQ0xGTkJRV3BDTEdOQlFXbENMRU5CUVVNc1NVRkJSQ3hGUVVGVk8wRkJRMmhETEUxQlFVMHNWMEZCVnl4VlFVRlZMR2xDUVVGV0xFZEJRVGhDTEd0Q1FVRXZRenRCUVVOQkxFMUJRVTBzWlVGQlpTeERRVUZETEU5QlFVUXNSMEZCVnl4cFFrRkJXQ3hIUVVFclFpeHJRa0ZCY0VRN08wRkJSVUVzVFVGQlRTeFhRVUZYTEUxQlFVMHNTVUZCVGl4RFFVRlhMRk5CUVZNc1owSkJRVlFzUTBGQk1FSXNVVUZCTVVJc1EwRkJXQ3hEUVVGcVFqdEJRVU5CTEUxQlFVMHNaVUZCWlN4TlFVRk5MRWxCUVU0c1EwRkJWeXhUUVVGVExHZENRVUZVTEVOQlFUQkNMRmxCUVRGQ0xFTkJRVmdzUTBGQmNrSTdPMEZCUlVFc1pVRkJZU3hQUVVGaUxFTkJRWEZDTzBGQlFVRXNWVUZCVXl4TlFVRk5MR1ZCUVU0c1EwRkJjMElzVFVGQmRFSXNRMEZCVkR0QlFVRkJMRWRCUVhKQ096dEJRVVZCTEZOQlFVOHNVMEZCVXl4SlFVRlVMRU5CUVdNc2FVSkJRVk03UVVGRE4wSXNUMEZCU1N4UFFVRlBMRTFCUVUwc2EwSkJRV3BDTzBGQlEwRXNWVUZCVHl4TFFVRkxMRk5CUVV3c1EwRkJaU3hEUVVGbUxFMUJRWE5DTEVsQlFYUkNMRWxCUVRoQ0xFdEJRVXNzVTBGQlRDeERRVUZsTEVOQlFXWXNUVUZCYzBJc1MwRkJTeXhYUVVGTUxFVkJRVE5FTzBGQlEwRXNSMEZJVFN4RFFVRlFPMEZCU1VFc1JVRmlSRHM3UVVGbFFTeExRVUZOTEhWQ1FVRjFRaXhUUVVGMlFpeHZRa0ZCZFVJc1EwRkJReXhQUVVGRUxFVkJRVlVzVFVGQlZpeEZRVUZ4UWp0QlFVTnFSQ3hWUVVGUkxHZENRVUZTTEVOQlFYbENMRTlCUVhwQ0xFVkJRV3RETEZsQlFVMDdRVUZEZGtNc1QwRkJUU3hoUVVGaExGTkJRVk1zWTBGQlZDeERRVUYzUWl4TlFVRjRRaXhEUVVGdVFqdEJRVU5CTEU5QlFVa3NaVUZCU2pzN1FVRkZRU3hQUVVGSkxFTkJRVU1zVDBGQlRDeEZRVUZqTzBGQlEySXNZVUZCVXl4WFFVRlhMRWRCUVZnc1IwRkJhVUlzVTBGQlV5eGpRVUZVTEVOQlFYZENMR1ZCUVhoQ0xFTkJRV3BDTEVkQlFUUkVMRmRCUVZjc1lVRkJXQ3hEUVVGNVFpeGhRVUY2UWl4RFFVRjFReXhoUVVGMlF5eERRVUZ4UkN4aFFVRnlSQ3hEUVVGdFJTeHpRa0ZCYmtVc1EwRkJNRVlzWVVGQk1VWXNRMEZCZDBjc01rSkJRWGhITEVOQlFYSkZPMEZCUTBFc1NVRkdSQ3hOUVVWUE8wRkJRMDRzWVVGQlV5eFhRVUZYTEVkQlFWZ3NSMEZCYVVJc1UwRkJVeXhqUVVGVUxFTkJRWGRDTEdWQlFYaENMRU5CUVdwQ0xFZEJRVFJFTEZkQlFWY3NZVUZCV0N4RFFVRjVRaXhoUVVGNlFpeERRVUYxUXl4aFFVRjJReXhEUVVGeFJDeHpRa0ZCY2tRc1EwRkJORVVzWVVGQk5VVXNRMEZCTUVZc01rSkJRVEZHTEVOQlFYSkZPMEZCUTBFN08wRkJSVVFzVlVGQlR5eGpRVUZRTEVOQlFYTkNMRVZCUVVNc1ZVRkJWU3hSUVVGWUxFVkJRWEZDTEU5QlFVOHNUMEZCTlVJc1JVRkJkRUk3UVVGRFFTeEhRVmhFTzBGQldVRXNSVUZpUkRzN1FVRmxRU3hMUVVGSkxHZENRVUZuUWl4RlFVRndRanRCUVVOQkxFdEJRVWtzVTBGQlV5eFRRVUZUTEdGQlFWUXNRMEZCZFVJc2IwSkJRWFpDTEVOQlFXSTdRVUZEUVN4UlFVRlBMRk5CUVZBc1IwRkJiVUlzUlVGQmJrSTdPMEZCUlVFc1ZVRkJVeXhQUVVGVUxFTkJRV2xDTEd0Q1FVRlZPMEZCUXpGQ0xFMUJRVWtzWTBGQll5eGxRVUZsTEUxQlFXWXNRMEZCYkVJN1FVRkRRU3hOUVVGSkxGVkJRVlVzVTBGQlV5eGhRVUZVTEVOQlFYVkNMRWRCUVhaQ0xFTkJRV1E3TzBGQlJVRXNUVUZCU1N4RFFVRkRMRmRCUVV3c1JVRkJhMEk3TzBGQlJXeENMR05CUVZrc1JVRkJXaXhIUVVGcFFpeE5RVUZxUWp0QlFVTkJMRlZCUVZFc1UwRkJVaXhIUVVGdlFpeFBRVUZQTEZkQlFWQXNSVUZCY0VJN1FVRkRRU3hWUVVGUkxGTkJRVklzUjBGQmIwSXNlVUpCUVhCQ096dEJRVVZCTEhWQ1FVRnhRaXhQUVVGeVFpeEZRVUU0UWl4TlFVRTVRanRCUVVOQkxGTkJRVThzVjBGQlVDeERRVUZ0UWl4UFFVRnVRanRCUVVOQkxFVkJXa1E3UVVGaFFTeERRV2hFUkRzN2EwSkJhMFJsTEZrN096czdPenM3TzBGRGNFUm1MRWxCUVUwc1lVRkJZU3hUUVVGaUxGVkJRV0VzUTBGQlF5eFBRVUZFTEVWQlFXRTdRVUZETDBJc1MwRkJUU3hoUVVGaExGRkJRVkVzWVVGQlVpeERRVUZ6UWl4aFFVRjBRaXhEUVVGdlF5eGhRVUZ3UXl4RFFVRnVRanRCUVVOQkxFdEJRVTBzWVVGQllTeFJRVUZSTEdGQlFWSXNRMEZCYzBJc1lVRkJkRUlzUTBGQmIwTXNZVUZCY0VNc1EwRkJia0k3TzBGQlJVRXNTMEZCU1N4VlFVRlZMRkZCUVZFc2FVSkJRWFJDTzBGQlEwRXNXVUZCVnl4blFrRkJXQ3hEUVVFMFFpeFBRVUUxUWl4RlFVRnhReXhaUVVGTk8wRkJRekZETEUxQlFVMHNUMEZCVHl4UlFVRlJMR3RDUVVGeVFqdEJRVU5CTEUxQlFVa3NTVUZCU2l4RlFVRlZPMEZCUTFRc1VVRkJTeXhqUVVGTUxFTkJRVzlDTEVWQlFVTXNWVUZCVlN4UlFVRllMRVZCUVhGQ0xFOUJRVThzVTBGQk5VSXNSVUZCZFVNc1VVRkJVU3hSUVVFdlF5eEZRVUZ3UWp0QlFVTkJMR0ZCUVZVc1NVRkJWanRCUVVOQk8wRkJRMFFzUlVGT1JEczdRVUZSUVN4WlFVRlhMR2RDUVVGWUxFTkJRVFJDTEU5QlFUVkNMRVZCUVhGRExGbEJRVTA3UVVGRE1VTXNUVUZCVFN4UFFVRlBMRkZCUVZFc2MwSkJRWEpDTzBGQlEwRXNUVUZCU1N4SlFVRktMRVZCUVZVN1FVRkRWQ3hSUVVGTExHTkJRVXdzUTBGQmIwSXNSVUZCUXl4VlFVRlZMRkZCUVZnc1JVRkJjVUlzVDBGQlR5eFRRVUUxUWl4RlFVRjFReXhSUVVGUkxGRkJRUzlETEVWQlFYQkNPMEZCUTBFc1lVRkJWU3hKUVVGV08wRkJRMEU3UVVGRFJDeEZRVTVFTzBGQlQwRXNRMEZ3UWtRN08ydENRWE5DWlN4Vk96czdPenM3T3p0QlEzUkNaaXhKUVVGTkxHZENRVUZuUWl4VFFVRm9RaXhoUVVGblFpeERRVUZETEV0QlFVUTdRVUZCUVN4NVIwRkZhVU1zUzBGR2FrTTdRVUZCUVN4RFFVRjBRanM3UVVGTlFTeEpRVUZOTEd0Q1FVRnJRaXhUUVVGc1FpeGxRVUZyUWl4RFFVRkRMRXRCUVVRc1JVRkJVU3hEUVVGU0xFVkJRV003UVVGQlFTeExRVU0zUWl4TFFVUTJRaXhIUVVOeFJTeExRVVJ5UlN4RFFVTTNRaXhMUVVRMlFqdEJRVUZCTEV0QlEzUkNMRk5CUkhOQ0xFZEJRM0ZGTEV0QlJISkZMRU5CUTNSQ0xGTkJSSE5DTzBGQlFVRXNTMEZEV0N4UlFVUlhMRWRCUTNGRkxFdEJSSEpGTEVOQlExZ3NVVUZFVnp0QlFVRkJMRXRCUTBRc1RVRkVReXhIUVVOeFJTeExRVVJ5UlN4RFFVTkVMRTFCUkVNN1FVRkJRU3hMUVVOUExGZEJSRkFzUjBGRGNVVXNTMEZFY2tVc1EwRkRUeXhYUVVSUU8wRkJRVUVzUzBGRGIwSXNVVUZFY0VJc1IwRkRjVVVzUzBGRWNrVXNRMEZEYjBJc1VVRkVjRUk3UVVGQlFTeExRVU00UWl4VlFVUTVRaXhIUVVOeFJTeExRVVJ5UlN4RFFVTTRRaXhWUVVRNVFqdEJRVUZCTEV0QlF6QkRMRWxCUkRGRExFZEJRM0ZGTEV0QlJISkZMRU5CUXpCRExFbEJSREZETzBGQlFVRXNTMEZEWjBRc1NVRkVhRVFzUjBGRGNVVXNTMEZFY2tVc1EwRkRaMFFzU1VGRWFFUTdRVUZCUVN4TFFVTnpSQ3hKUVVSMFJDeEhRVU54UlN4TFFVUnlSU3hEUVVOelJDeEpRVVIwUkR0QlFVRkJMRXRCUXpSRUxFbEJSRFZFTEVkQlEzRkZMRXRCUkhKRkxFTkJRelJFTEVsQlJEVkVPenM3UVVGSGNrTXNTMEZCVFN4WlFVRlpMRTlCUVU4c1RVRkJVQ3hIUVVOcVFpeFBRVUZQTEVkQlFWQXNRMEZCVnp0QlFVRkJMRk5CUVZNc1kwRkJZeXhMUVVGa0xFTkJRVlE3UVVGQlFTeEZRVUZZTEVWQlFUQkRMRWxCUVRGRExFTkJRU3RETEVWQlFTOURMRU5CUkdsQ0xFZEJRMjlETEVWQlJIUkVPenRCUVVkQkxIZE9RVXQ1UXl4TFFVeDZReXh4U0VGUGEwUXNVMEZRYkVRc2IwaEJVMmxFTEZGQlZHcEVMREJLUVdGdlJDeERRV0p3UkN4M1FrRmpUeXhUUVdSUUxDdEhRV2RDZVVNc1YwRm9RbnBETERCRVFXbENiME1zVVVGcVFuQkRMR2xHUVd0Q01rUXNWVUZzUWpORUxHbEdRVzFDTWtRc1NVRnVRak5FTEdsR1FXOUNNa1FzU1VGd1FqTkVMSEZJUVhGQ0swWXNTVUZ5UWk5R0xGVkJjVUozUnl4SlFYSkNlRWM3UVVGblEwRXNRMEYwUTBRN08ydENRWGREWlN4bE96czdPenM3T3pzN08wRkRPVU5tT3pzN08wRkJRMEU3T3pzN096dFJRVVZUTEdVc1IwRkJRU3hwUWp0UlFVRnBRaXhYTEVkQlFVRXNaVHM3T3pzN096czdRVU5JTVVJc1NVRkJUU3h0YlVKQlFVNDdPMEZCYVVKQkxFbEJRVTBzWTBGQll5eFRRVUZrTEZkQlFXTXNSMEZCVFR0QlFVTjZRaXhMUVVGSkxGZEJRVmNzVTBGQlV5eGpRVUZVTEVOQlFYZENMRkZCUVhoQ0xFTkJRV1k3UVVGRFFTeFZRVUZUTEZOQlFWUXNSMEZCY1VJc1VVRkJja0k3UVVGRFFTeERRVWhFT3p0clFrRkxaU3hYT3pzN096czdPenM3TzBGRGRFSm1PenRCUVVWQkxFbEJRVTBzVjBGQlZ5eFRRVUZZTEZGQlFWY3NRMEZCUXl4RlFVRkVMRVZCUVVzc1NVRkJUQ3hGUVVGak8wRkJRemRDTEUxQlFVa3NaMEpCUVVvN08wRkJSVUVzVTBGQlR5eFpRVUZYTzBGQlFVRTdRVUZCUVRzN1FVRkRhRUlzVVVGQlRTeGxRVUZsTEZOQlFXWXNXVUZCWlR0QlFVRkJMR0ZCUVUwc1IwRkJSeXhMUVVGSUxFTkJRVk1zUzBGQlZDeEZRVUZsTEZWQlFXWXNRMEZCVGp0QlFVRkJMRXRCUVhKQ096dEJRVVZCTEdsQ1FVRmhMRTlCUVdJN1FVRkRRU3hqUVVGVkxGZEJRVmNzV1VGQldDeEZRVUY1UWl4SlFVRjZRaXhEUVVGV08wRkJRMFFzUjBGTVJEdEJRVTFFTEVOQlZFUTdPMEZCVjBFc1NVRkJUU3hqUVVGakxGTkJRV1FzVjBGQll5eEhRVUZOTzBGQlEzcENMSE5DUVVGVExFOUJRVlFzUTBGQmFVSTdRVUZCUVN4WFFVRlJMRXRCUVVzc1UwRkJUQ3hEUVVGbExFZEJRV1lzUTBGQmJVSXNUMEZCYmtJc1EwRkJVanRCUVVGQkxFZEJRV3BDTzBGQlEwRXNhMEpCUVVzc1UwRkJUQ3hEUVVGbExFZEJRV1lzUTBGQmJVSXNUMEZCYmtJN1FVRkRRU3hEUVVoRU96dEJRVXRCTEVsQlFVMHNZMEZCWXl4VFFVRmtMRmRCUVdNc1IwRkJUVHRCUVVONlFpeE5RVUZKTEUxQlFVMHNVMEZCVXl4alFVRlVMRU5CUVhkQ0xHVkJRWGhDTEVOQlFWWTdRVUZEUVN4TlFVRkpMR05CUVVvc1EwRkJiVUlzUlVGQlF5eFZRVUZWTEZGQlFWZ3NSVUZCY1VJc1QwRkJUeXhQUVVFMVFpeEZRVUZ1UWp0QlFVTkJMRU5CU0VRN08xRkJTMU1zVVN4SFFVRkJMRkU3VVVGQlZTeFhMRWRCUVVFc1Z6dFJRVUZoTEZjc1IwRkJRU3hYSWl3aVptbHNaU0k2SW1kbGJtVnlZWFJsWkM1cWN5SXNJbk52ZFhKalpWSnZiM1FpT2lJaUxDSnpiM1Z5WTJWelEyOXVkR1Z1ZENJNld5SW9ablZ1WTNScGIyNG9LWHRtZFc1amRHbHZiaUJ5S0dVc2JpeDBLWHRtZFc1amRHbHZiaUJ2S0drc1ppbDdhV1lvSVc1YmFWMHBlMmxtS0NGbFcybGRLWHQyWVhJZ1l6MWNJbVoxYm1OMGFXOXVYQ0k5UFhSNWNHVnZaaUJ5WlhGMWFYSmxKaVp5WlhGMWFYSmxPMmxtS0NGbUppWmpLWEpsZEhWeWJpQmpLR2tzSVRBcE8ybG1LSFVwY21WMGRYSnVJSFVvYVN3aE1DazdkbUZ5SUdFOWJtVjNJRVZ5Y205eUtGd2lRMkZ1Ym05MElHWnBibVFnYlc5a2RXeGxJQ2RjSWl0cEsxd2lKMXdpS1R0MGFISnZkeUJoTG1OdlpHVTlYQ0pOVDBSVlRFVmZUazlVWDBaUFZVNUVYQ0lzWVgxMllYSWdjRDF1VzJsZFBYdGxlSEJ2Y25Sek9udDlmVHRsVzJsZFd6QmRMbU5oYkd3b2NDNWxlSEJ2Y25SekxHWjFibU4wYVc5dUtISXBlM1poY2lCdVBXVmJhVjFiTVYxYmNsMDdjbVYwZFhKdUlHOG9ibng4Y2lsOUxIQXNjQzVsZUhCdmNuUnpMSElzWlN4dUxIUXBmWEpsZEhWeWJpQnVXMmxkTG1WNGNHOXlkSE45Wm05eUtIWmhjaUIxUFZ3aVpuVnVZM1JwYjI1Y0lqMDlkSGx3Wlc5bUlISmxjWFZwY21VbUpuSmxjWFZwY21Vc2FUMHdPMms4ZEM1c1pXNW5kR2c3YVNzcktXOG9kRnRwWFNrN2NtVjBkWEp1SUc5OWNtVjBkWEp1SUhKOUtTZ3BJaXdpTHlvZ2MyMXZiM1JvYzJOeWIyeHNJSFl3TGpRdU1DQXRJREl3TVRnZ0xTQkVkWE4wWVc0Z1MyRnpkR1Z1TENCS1pYSmxiV2xoY3lCTlpXNXBZMmhsYkd4cElDMGdUVWxVSUV4cFkyVnVjMlVnS2k5Y2JpaG1kVzVqZEdsdmJpQW9LU0I3WEc0Z0lDZDFjMlVnYzNSeWFXTjBKenRjYmx4dUlDQXZMeUJ3YjJ4NVptbHNiRnh1SUNCbWRXNWpkR2x2YmlCd2IyeDVabWxzYkNncElIdGNiaUFnSUNBdkx5QmhiR2xoYzJWelhHNGdJQ0FnZG1GeUlIY2dQU0IzYVc1a2IzYzdYRzRnSUNBZ2RtRnlJR1FnUFNCa2IyTjFiV1Z1ZER0Y2JseHVJQ0FnSUM4dklISmxkSFZ5YmlCcFppQnpZM0p2Ykd3Z1ltVm9ZWFpwYjNJZ2FYTWdjM1Z3Y0c5eWRHVmtJR0Z1WkNCd2IyeDVabWxzYkNCcGN5QnViM1FnWm05eVkyVmtYRzRnSUNBZ2FXWWdLRnh1SUNBZ0lDQWdKM05qY205c2JFSmxhR0YyYVc5eUp5QnBiaUJrTG1SdlkzVnRaVzUwUld4bGJXVnVkQzV6ZEhsc1pTQW1KbHh1SUNBZ0lDQWdkeTVmWDJadmNtTmxVMjF2YjNSb1UyTnliMnhzVUc5c2VXWnBiR3hmWHlBaFBUMGdkSEoxWlZ4dUlDQWdJQ2tnZTF4dUlDQWdJQ0FnY21WMGRYSnVPMXh1SUNBZ0lIMWNibHh1SUNBZ0lDOHZJR2RzYjJKaGJITmNiaUFnSUNCMllYSWdSV3hsYldWdWRDQTlJSGN1U0ZSTlRFVnNaVzFsYm5RZ2ZId2dkeTVGYkdWdFpXNTBPMXh1SUNBZ0lIWmhjaUJUUTFKUFRFeGZWRWxOUlNBOUlEUTJPRHRjYmx4dUlDQWdJQzh2SUc5aWFtVmpkQ0JuWVhSb1pYSnBibWNnYjNKcFoybHVZV3dnYzJOeWIyeHNJRzFsZEdodlpITmNiaUFnSUNCMllYSWdiM0pwWjJsdVlXd2dQU0I3WEc0Z0lDQWdJQ0J6WTNKdmJHdzZJSGN1YzJOeWIyeHNJSHg4SUhjdWMyTnliMnhzVkc4c1hHNGdJQ0FnSUNCelkzSnZiR3hDZVRvZ2R5NXpZM0p2Ykd4Q2VTeGNiaUFnSUNBZ0lHVnNaVzFsYm5SVFkzSnZiR3c2SUVWc1pXMWxiblF1Y0hKdmRHOTBlWEJsTG5OamNtOXNiQ0I4ZkNCelkzSnZiR3hGYkdWdFpXNTBMRnh1SUNBZ0lDQWdjMk55YjJ4c1NXNTBiMVpwWlhjNklFVnNaVzFsYm5RdWNISnZkRzkwZVhCbExuTmpjbTlzYkVsdWRHOVdhV1YzWEc0Z0lDQWdmVHRjYmx4dUlDQWdJQzh2SUdSbFptbHVaU0IwYVcxcGJtY2diV1YwYUc5a1hHNGdJQ0FnZG1GeUlHNXZkeUE5WEc0Z0lDQWdJQ0IzTG5CbGNtWnZjbTFoYm1ObElDWW1JSGN1Y0dWeVptOXliV0Z1WTJVdWJtOTNYRzRnSUNBZ0lDQWdJRDhnZHk1d1pYSm1iM0p0WVc1alpTNXViM2N1WW1sdVpDaDNMbkJsY21admNtMWhibU5sS1Z4dUlDQWdJQ0FnSUNBNklFUmhkR1V1Ym05M08xeHVYRzRnSUNBZ0x5b3FYRzRnSUNBZ0lDb2dhVzVrYVdOaGRHVnpJR2xtSUdFZ2RHaGxJR04xY25KbGJuUWdZbkp2ZDNObGNpQnBjeUJ0WVdSbElHSjVJRTFwWTNKdmMyOW1kRnh1SUNBZ0lDQXFJRUJ0WlhSb2IyUWdhWE5OYVdOeWIzTnZablJDY205M2MyVnlYRzRnSUNBZ0lDb2dRSEJoY21GdElIdFRkSEpwYm1kOUlIVnpaWEpCWjJWdWRGeHVJQ0FnSUNBcUlFQnlaWFIxY201eklIdENiMjlzWldGdWZWeHVJQ0FnSUNBcUwxeHVJQ0FnSUdaMWJtTjBhVzl1SUdselRXbGpjbTl6YjJaMFFuSnZkM05sY2loMWMyVnlRV2RsYm5RcElIdGNiaUFnSUNBZ0lIWmhjaUIxYzJWeVFXZGxiblJRWVhSMFpYSnVjeUE5SUZzblRWTkpSU0FuTENBblZISnBaR1Z1ZEM4bkxDQW5SV1JuWlM4blhUdGNibHh1SUNBZ0lDQWdjbVYwZFhKdUlHNWxkeUJTWldkRmVIQW9kWE5sY2tGblpXNTBVR0YwZEdWeWJuTXVhbTlwYmlnbmZDY3BLUzUwWlhOMEtIVnpaWEpCWjJWdWRDazdYRzRnSUNBZ2ZWeHVYRzRnSUNBZ0x5cGNiaUFnSUNBZ0tpQkpSU0JvWVhNZ2NtOTFibVJwYm1jZ1luVm5JSEp2ZFc1a2FXNW5JR1J2ZDI0Z1kyeHBaVzUwU0dWcFoyaDBJR0Z1WkNCamJHbGxiblJYYVdSMGFDQmhibVJjYmlBZ0lDQWdLaUJ5YjNWdVpHbHVaeUIxY0NCelkzSnZiR3hJWldsbmFIUWdZVzVrSUhOamNtOXNiRmRwWkhSb0lHTmhkWE5wYm1jZ1ptRnNjMlVnY0c5emFYUnBkbVZ6WEc0Z0lDQWdJQ29nYjI0Z2FHRnpVMk55YjJ4c1lXSnNaVk53WVdObFhHNGdJQ0FnSUNvdlhHNGdJQ0FnZG1GeUlGSlBWVTVFU1U1SFgxUlBURVZTUVU1RFJTQTlJR2x6VFdsamNtOXpiMlowUW5KdmQzTmxjaWgzTG01aGRtbG5ZWFJ2Y2k1MWMyVnlRV2RsYm5RcElEOGdNU0E2SURBN1hHNWNiaUFnSUNBdktpcGNiaUFnSUNBZ0tpQmphR0Z1WjJWeklITmpjbTlzYkNCd2IzTnBkR2x2YmlCcGJuTnBaR1VnWVc0Z1pXeGxiV1Z1ZEZ4dUlDQWdJQ0FxSUVCdFpYUm9iMlFnYzJOeWIyeHNSV3hsYldWdWRGeHVJQ0FnSUNBcUlFQndZWEpoYlNCN1RuVnRZbVZ5ZlNCNFhHNGdJQ0FnSUNvZ1FIQmhjbUZ0SUh0T2RXMWlaWEo5SUhsY2JpQWdJQ0FnS2lCQWNtVjBkWEp1Y3lCN2RXNWtaV1pwYm1Wa2ZWeHVJQ0FnSUNBcUwxeHVJQ0FnSUdaMWJtTjBhVzl1SUhOamNtOXNiRVZzWlcxbGJuUW9lQ3dnZVNrZ2UxeHVJQ0FnSUNBZ2RHaHBjeTV6WTNKdmJHeE1aV1owSUQwZ2VEdGNiaUFnSUNBZ0lIUm9hWE11YzJOeWIyeHNWRzl3SUQwZ2VUdGNiaUFnSUNCOVhHNWNiaUFnSUNBdktpcGNiaUFnSUNBZ0tpQnlaWFIxY201eklISmxjM1ZzZENCdlppQmhjSEJzZVdsdVp5QmxZWE5sSUcxaGRHZ2dablZ1WTNScGIyNGdkRzhnWVNCdWRXMWlaWEpjYmlBZ0lDQWdLaUJBYldWMGFHOWtJR1ZoYzJWY2JpQWdJQ0FnS2lCQWNHRnlZVzBnZTA1MWJXSmxjbjBnYTF4dUlDQWdJQ0FxSUVCeVpYUjFjbTV6SUh0T2RXMWlaWEo5WEc0Z0lDQWdJQ292WEc0Z0lDQWdablZ1WTNScGIyNGdaV0Z6WlNocktTQjdYRzRnSUNBZ0lDQnlaWFIxY200Z01DNDFJQ29nS0RFZ0xTQk5ZWFJvTG1OdmN5aE5ZWFJvTGxCSklDb2dheWtwTzF4dUlDQWdJSDFjYmx4dUlDQWdJQzhxS2x4dUlDQWdJQ0FxSUdsdVpHbGpZWFJsY3lCcFppQmhJSE50YjI5MGFDQmlaV2hoZG1sdmNpQnphRzkxYkdRZ1ltVWdZWEJ3YkdsbFpGeHVJQ0FnSUNBcUlFQnRaWFJvYjJRZ2MyaHZkV3hrUW1GcGJFOTFkRnh1SUNBZ0lDQXFJRUJ3WVhKaGJTQjdUblZ0WW1WeWZFOWlhbVZqZEgwZ1ptbHljM1JCY21kY2JpQWdJQ0FnS2lCQWNtVjBkWEp1Y3lCN1FtOXZiR1ZoYm4xY2JpQWdJQ0FnS2k5Y2JpQWdJQ0JtZFc1amRHbHZiaUJ6YUc5MWJHUkNZV2xzVDNWMEtHWnBjbk4wUVhKbktTQjdYRzRnSUNBZ0lDQnBaaUFvWEc0Z0lDQWdJQ0FnSUdacGNuTjBRWEpuSUQwOVBTQnVkV3hzSUh4OFhHNGdJQ0FnSUNBZ0lIUjVjR1Z2WmlCbWFYSnpkRUZ5WnlBaFBUMGdKMjlpYW1WamRDY2dmSHhjYmlBZ0lDQWdJQ0FnWm1seWMzUkJjbWN1WW1Wb1lYWnBiM0lnUFQwOUlIVnVaR1ZtYVc1bFpDQjhmRnh1SUNBZ0lDQWdJQ0JtYVhKemRFRnlaeTVpWldoaGRtbHZjaUE5UFQwZ0oyRjFkRzhuSUh4OFhHNGdJQ0FnSUNBZ0lHWnBjbk4wUVhKbkxtSmxhR0YyYVc5eUlEMDlQU0FuYVc1emRHRnVkQ2RjYmlBZ0lDQWdJQ2tnZTF4dUlDQWdJQ0FnSUNBdkx5Qm1hWEp6ZENCaGNtZDFiV1Z1ZENCcGN5QnViM1FnWVc0Z2IySnFaV04wTDI1MWJHeGNiaUFnSUNBZ0lDQWdMeThnYjNJZ1ltVm9ZWFpwYjNJZ2FYTWdZWFYwYnl3Z2FXNXpkR0Z1ZENCdmNpQjFibVJsWm1sdVpXUmNiaUFnSUNBZ0lDQWdjbVYwZFhKdUlIUnlkV1U3WEc0Z0lDQWdJQ0I5WEc1Y2JpQWdJQ0FnSUdsbUlDaDBlWEJsYjJZZ1ptbHljM1JCY21jZ1BUMDlJQ2R2WW1wbFkzUW5JQ1ltSUdacGNuTjBRWEpuTG1KbGFHRjJhVzl5SUQwOVBTQW5jMjF2YjNSb0p5a2dlMXh1SUNBZ0lDQWdJQ0F2THlCbWFYSnpkQ0JoY21kMWJXVnVkQ0JwY3lCaGJpQnZZbXBsWTNRZ1lXNWtJR0psYUdGMmFXOXlJR2x6SUhOdGIyOTBhRnh1SUNBZ0lDQWdJQ0J5WlhSMWNtNGdabUZzYzJVN1hHNGdJQ0FnSUNCOVhHNWNiaUFnSUNBZ0lDOHZJSFJvY205M0lHVnljbTl5SUhkb1pXNGdZbVZvWVhacGIzSWdhWE1nYm05MElITjFjSEJ2Y25SbFpGeHVJQ0FnSUNBZ2RHaHliM2NnYm1WM0lGUjVjR1ZGY25KdmNpaGNiaUFnSUNBZ0lDQWdKMkpsYUdGMmFXOXlJRzFsYldKbGNpQnZaaUJUWTNKdmJHeFBjSFJwYjI1eklDY2dLMXh1SUNBZ0lDQWdJQ0FnSUdacGNuTjBRWEpuTG1KbGFHRjJhVzl5SUN0Y2JpQWdJQ0FnSUNBZ0lDQW5JR2x6SUc1dmRDQmhJSFpoYkdsa0lIWmhiSFZsSUdadmNpQmxiblZ0WlhKaGRHbHZiaUJUWTNKdmJHeENaV2hoZG1sdmNpNG5YRzRnSUNBZ0lDQXBPMXh1SUNBZ0lIMWNibHh1SUNBZ0lDOHFLbHh1SUNBZ0lDQXFJR2x1WkdsallYUmxjeUJwWmlCaGJpQmxiR1Z0Wlc1MElHaGhjeUJ6WTNKdmJHeGhZbXhsSUhOd1lXTmxJR2x1SUhSb1pTQndjbTkyYVdSbFpDQmhlR2x6WEc0Z0lDQWdJQ29nUUcxbGRHaHZaQ0JvWVhOVFkzSnZiR3hoWW14bFUzQmhZMlZjYmlBZ0lDQWdLaUJBY0dGeVlXMGdlMDV2WkdWOUlHVnNYRzRnSUNBZ0lDb2dRSEJoY21GdElIdFRkSEpwYm1kOUlHRjRhWE5jYmlBZ0lDQWdLaUJBY21WMGRYSnVjeUI3UW05dmJHVmhibjFjYmlBZ0lDQWdLaTljYmlBZ0lDQm1kVzVqZEdsdmJpQm9ZWE5UWTNKdmJHeGhZbXhsVTNCaFkyVW9aV3dzSUdGNGFYTXBJSHRjYmlBZ0lDQWdJR2xtSUNoaGVHbHpJRDA5UFNBbldTY3BJSHRjYmlBZ0lDQWdJQ0FnY21WMGRYSnVJR1ZzTG1Oc2FXVnVkRWhsYVdkb2RDQXJJRkpQVlU1RVNVNUhYMVJQVEVWU1FVNURSU0E4SUdWc0xuTmpjbTlzYkVobGFXZG9kRHRjYmlBZ0lDQWdJSDFjYmx4dUlDQWdJQ0FnYVdZZ0tHRjRhWE1nUFQwOUlDZFlKeWtnZTF4dUlDQWdJQ0FnSUNCeVpYUjFjbTRnWld3dVkyeHBaVzUwVjJsa2RHZ2dLeUJTVDFWT1JFbE9SMTlVVDB4RlVrRk9RMFVnUENCbGJDNXpZM0p2Ykd4WGFXUjBhRHRjYmlBZ0lDQWdJSDFjYmlBZ0lDQjlYRzVjYmlBZ0lDQXZLaXBjYmlBZ0lDQWdLaUJwYm1ScFkyRjBaWE1nYVdZZ1lXNGdaV3hsYldWdWRDQm9ZWE1nWVNCelkzSnZiR3hoWW14bElHOTJaWEptYkc5M0lIQnliM0JsY25SNUlHbHVJSFJvWlNCaGVHbHpYRzRnSUNBZ0lDb2dRRzFsZEdodlpDQmpZVzVQZG1WeVpteHZkMXh1SUNBZ0lDQXFJRUJ3WVhKaGJTQjdUbTlrWlgwZ1pXeGNiaUFnSUNBZ0tpQkFjR0Z5WVcwZ2UxTjBjbWx1WjMwZ1lYaHBjMXh1SUNBZ0lDQXFJRUJ5WlhSMWNtNXpJSHRDYjI5c1pXRnVmVnh1SUNBZ0lDQXFMMXh1SUNBZ0lHWjFibU4wYVc5dUlHTmhiazkyWlhKbWJHOTNLR1ZzTENCaGVHbHpLU0I3WEc0Z0lDQWdJQ0IyWVhJZ2IzWmxjbVpzYjNkV1lXeDFaU0E5SUhjdVoyVjBRMjl0Y0hWMFpXUlRkSGxzWlNobGJDd2diblZzYkNsYkoyOTJaWEptYkc5M0p5QXJJR0Y0YVhOZE8xeHVYRzRnSUNBZ0lDQnlaWFIxY200Z2IzWmxjbVpzYjNkV1lXeDFaU0E5UFQwZ0oyRjFkRzhuSUh4OElHOTJaWEptYkc5M1ZtRnNkV1VnUFQwOUlDZHpZM0p2Ykd3bk8xeHVJQ0FnSUgxY2JseHVJQ0FnSUM4cUtseHVJQ0FnSUNBcUlHbHVaR2xqWVhSbGN5QnBaaUJoYmlCbGJHVnRaVzUwSUdOaGJpQmlaU0J6WTNKdmJHeGxaQ0JwYmlCbGFYUm9aWElnWVhocGMxeHVJQ0FnSUNBcUlFQnRaWFJvYjJRZ2FYTlRZM0p2Ykd4aFlteGxYRzRnSUNBZ0lDb2dRSEJoY21GdElIdE9iMlJsZlNCbGJGeHVJQ0FnSUNBcUlFQndZWEpoYlNCN1UzUnlhVzVuZlNCaGVHbHpYRzRnSUNBZ0lDb2dRSEpsZEhWeWJuTWdlMEp2YjJ4bFlXNTlYRzRnSUNBZ0lDb3ZYRzRnSUNBZ1puVnVZM1JwYjI0Z2FYTlRZM0p2Ykd4aFlteGxLR1ZzS1NCN1hHNGdJQ0FnSUNCMllYSWdhWE5UWTNKdmJHeGhZbXhsV1NBOUlHaGhjMU5qY205c2JHRmliR1ZUY0dGalpTaGxiQ3dnSjFrbktTQW1KaUJqWVc1UGRtVnlabXh2ZHlobGJDd2dKMWtuS1R0Y2JpQWdJQ0FnSUhaaGNpQnBjMU5qY205c2JHRmliR1ZZSUQwZ2FHRnpVMk55YjJ4c1lXSnNaVk53WVdObEtHVnNMQ0FuV0NjcElDWW1JR05oYms5MlpYSm1iRzkzS0dWc0xDQW5XQ2NwTzF4dVhHNGdJQ0FnSUNCeVpYUjFjbTRnYVhOVFkzSnZiR3hoWW14bFdTQjhmQ0JwYzFOamNtOXNiR0ZpYkdWWU8xeHVJQ0FnSUgxY2JseHVJQ0FnSUM4cUtseHVJQ0FnSUNBcUlHWnBibVJ6SUhOamNtOXNiR0ZpYkdVZ2NHRnlaVzUwSUc5bUlHRnVJR1ZzWlcxbGJuUmNiaUFnSUNBZ0tpQkFiV1YwYUc5a0lHWnBibVJUWTNKdmJHeGhZbXhsVUdGeVpXNTBYRzRnSUNBZ0lDb2dRSEJoY21GdElIdE9iMlJsZlNCbGJGeHVJQ0FnSUNBcUlFQnlaWFIxY201eklIdE9iMlJsZlNCbGJGeHVJQ0FnSUNBcUwxeHVJQ0FnSUdaMWJtTjBhVzl1SUdacGJtUlRZM0p2Ykd4aFlteGxVR0Z5Wlc1MEtHVnNLU0I3WEc0Z0lDQWdJQ0IyWVhJZ2FYTkNiMlI1TzF4dVhHNGdJQ0FnSUNCa2J5QjdYRzRnSUNBZ0lDQWdJR1ZzSUQwZ1pXd3VjR0Z5Wlc1MFRtOWtaVHRjYmx4dUlDQWdJQ0FnSUNCcGMwSnZaSGtnUFNCbGJDQTlQVDBnWkM1aWIyUjVPMXh1SUNBZ0lDQWdmU0IzYUdsc1pTQW9hWE5DYjJSNUlEMDlQU0JtWVd4elpTQW1KaUJwYzFOamNtOXNiR0ZpYkdVb1pXd3BJRDA5UFNCbVlXeHpaU2s3WEc1Y2JpQWdJQ0FnSUdselFtOWtlU0E5SUc1MWJHdzdYRzVjYmlBZ0lDQWdJSEpsZEhWeWJpQmxiRHRjYmlBZ0lDQjlYRzVjYmlBZ0lDQXZLaXBjYmlBZ0lDQWdLaUJ6Wld4bUlHbHVkbTlyWldRZ1puVnVZM1JwYjI0Z2RHaGhkQ3dnWjJsMlpXNGdZU0JqYjI1MFpYaDBMQ0J6ZEdWd2N5QjBhSEp2ZFdkb0lITmpjbTlzYkdsdVoxeHVJQ0FnSUNBcUlFQnRaWFJvYjJRZ2MzUmxjRnh1SUNBZ0lDQXFJRUJ3WVhKaGJTQjdUMkpxWldOMGZTQmpiMjUwWlhoMFhHNGdJQ0FnSUNvZ1FISmxkSFZ5Ym5NZ2UzVnVaR1ZtYVc1bFpIMWNiaUFnSUNBZ0tpOWNiaUFnSUNCbWRXNWpkR2x2YmlCemRHVndLR052Ym5SbGVIUXBJSHRjYmlBZ0lDQWdJSFpoY2lCMGFXMWxJRDBnYm05M0tDazdYRzRnSUNBZ0lDQjJZWElnZG1Gc2RXVTdYRzRnSUNBZ0lDQjJZWElnWTNWeWNtVnVkRmc3WEc0Z0lDQWdJQ0IyWVhJZ1kzVnljbVZ1ZEZrN1hHNGdJQ0FnSUNCMllYSWdaV3hoY0hObFpDQTlJQ2gwYVcxbElDMGdZMjl1ZEdWNGRDNXpkR0Z5ZEZScGJXVXBJQzhnVTBOU1QweE1YMVJKVFVVN1hHNWNiaUFnSUNBZ0lDOHZJR0YyYjJsa0lHVnNZWEJ6WldRZ2RHbHRaWE1nYUdsbmFHVnlJSFJvWVc0Z2IyNWxYRzRnSUNBZ0lDQmxiR0Z3YzJWa0lEMGdaV3hoY0hObFpDQStJREVnUHlBeElEb2daV3hoY0hObFpEdGNibHh1SUNBZ0lDQWdMeThnWVhCd2JIa2daV0Z6YVc1bklIUnZJR1ZzWVhCelpXUWdkR2x0WlZ4dUlDQWdJQ0FnZG1Gc2RXVWdQU0JsWVhObEtHVnNZWEJ6WldRcE8xeHVYRzRnSUNBZ0lDQmpkWEp5Wlc1MFdDQTlJR052Ym5SbGVIUXVjM1JoY25SWUlDc2dLR052Ym5SbGVIUXVlQ0F0SUdOdmJuUmxlSFF1YzNSaGNuUllLU0FxSUhaaGJIVmxPMXh1SUNBZ0lDQWdZM1Z5Y21WdWRGa2dQU0JqYjI1MFpYaDBMbk4wWVhKMFdTQXJJQ2hqYjI1MFpYaDBMbmtnTFNCamIyNTBaWGgwTG5OMFlYSjBXU2tnS2lCMllXeDFaVHRjYmx4dUlDQWdJQ0FnWTI5dWRHVjRkQzV0WlhSb2IyUXVZMkZzYkNoamIyNTBaWGgwTG5OamNtOXNiR0ZpYkdVc0lHTjFjbkpsYm5SWUxDQmpkWEp5Wlc1MFdTazdYRzVjYmlBZ0lDQWdJQzh2SUhOamNtOXNiQ0J0YjNKbElHbG1JSGRsSUdoaGRtVWdibTkwSUhKbFlXTm9aV1FnYjNWeUlHUmxjM1JwYm1GMGFXOXVYRzRnSUNBZ0lDQnBaaUFvWTNWeWNtVnVkRmdnSVQwOUlHTnZiblJsZUhRdWVDQjhmQ0JqZFhKeVpXNTBXU0FoUFQwZ1kyOXVkR1Y0ZEM1NUtTQjdYRzRnSUNBZ0lDQWdJSGN1Y21WeGRXVnpkRUZ1YVcxaGRHbHZia1p5WVcxbEtITjBaWEF1WW1sdVpDaDNMQ0JqYjI1MFpYaDBLU2s3WEc0Z0lDQWdJQ0I5WEc0Z0lDQWdmVnh1WEc0Z0lDQWdMeW9xWEc0Z0lDQWdJQ29nYzJOeWIyeHNjeUIzYVc1a2IzY2diM0lnWld4bGJXVnVkQ0IzYVhSb0lHRWdjMjF2YjNSb0lHSmxhR0YyYVc5eVhHNGdJQ0FnSUNvZ1FHMWxkR2h2WkNCemJXOXZkR2hUWTNKdmJHeGNiaUFnSUNBZ0tpQkFjR0Z5WVcwZ2UwOWlhbVZqZEh4T2IyUmxmU0JsYkZ4dUlDQWdJQ0FxSUVCd1lYSmhiU0I3VG5WdFltVnlmU0I0WEc0Z0lDQWdJQ29nUUhCaGNtRnRJSHRPZFcxaVpYSjlJSGxjYmlBZ0lDQWdLaUJBY21WMGRYSnVjeUI3ZFc1a1pXWnBibVZrZlZ4dUlDQWdJQ0FxTDF4dUlDQWdJR1oxYm1OMGFXOXVJSE50YjI5MGFGTmpjbTlzYkNobGJDd2dlQ3dnZVNrZ2UxeHVJQ0FnSUNBZ2RtRnlJSE5qY205c2JHRmliR1U3WEc0Z0lDQWdJQ0IyWVhJZ2MzUmhjblJZTzF4dUlDQWdJQ0FnZG1GeUlITjBZWEowV1R0Y2JpQWdJQ0FnSUhaaGNpQnRaWFJvYjJRN1hHNGdJQ0FnSUNCMllYSWdjM1JoY25SVWFXMWxJRDBnYm05M0tDazdYRzVjYmlBZ0lDQWdJQzh2SUdSbFptbHVaU0J6WTNKdmJHd2dZMjl1ZEdWNGRGeHVJQ0FnSUNBZ2FXWWdLR1ZzSUQwOVBTQmtMbUp2WkhrcElIdGNiaUFnSUNBZ0lDQWdjMk55YjJ4c1lXSnNaU0E5SUhjN1hHNGdJQ0FnSUNBZ0lITjBZWEowV0NBOUlIY3VjMk55YjJ4c1dDQjhmQ0IzTG5CaFoyVllUMlptYzJWME8xeHVJQ0FnSUNBZ0lDQnpkR0Z5ZEZrZ1BTQjNMbk5qY205c2JGa2dmSHdnZHk1d1lXZGxXVTltWm5ObGREdGNiaUFnSUNBZ0lDQWdiV1YwYUc5a0lEMGdiM0pwWjJsdVlXd3VjMk55YjJ4c08xeHVJQ0FnSUNBZ2ZTQmxiSE5sSUh0Y2JpQWdJQ0FnSUNBZ2MyTnliMnhzWVdKc1pTQTlJR1ZzTzF4dUlDQWdJQ0FnSUNCemRHRnlkRmdnUFNCbGJDNXpZM0p2Ykd4TVpXWjBPMXh1SUNBZ0lDQWdJQ0J6ZEdGeWRGa2dQU0JsYkM1elkzSnZiR3hVYjNBN1hHNGdJQ0FnSUNBZ0lHMWxkR2h2WkNBOUlITmpjbTlzYkVWc1pXMWxiblE3WEc0Z0lDQWdJQ0I5WEc1Y2JpQWdJQ0FnSUM4dklITmpjbTlzYkNCc2IyOXdhVzVuSUc5MlpYSWdZU0JtY21GdFpWeHVJQ0FnSUNBZ2MzUmxjQ2g3WEc0Z0lDQWdJQ0FnSUhOamNtOXNiR0ZpYkdVNklITmpjbTlzYkdGaWJHVXNYRzRnSUNBZ0lDQWdJRzFsZEdodlpEb2diV1YwYUc5a0xGeHVJQ0FnSUNBZ0lDQnpkR0Z5ZEZScGJXVTZJSE4wWVhKMFZHbHRaU3hjYmlBZ0lDQWdJQ0FnYzNSaGNuUllPaUJ6ZEdGeWRGZ3NYRzRnSUNBZ0lDQWdJSE4wWVhKMFdUb2djM1JoY25SWkxGeHVJQ0FnSUNBZ0lDQjRPaUI0TEZ4dUlDQWdJQ0FnSUNCNU9pQjVYRzRnSUNBZ0lDQjlLVHRjYmlBZ0lDQjlYRzVjYmlBZ0lDQXZMeUJQVWtsSFNVNUJUQ0JOUlZSSVQwUlRJRTlXUlZKU1NVUkZVMXh1SUNBZ0lDOHZJSGN1YzJOeWIyeHNJR0Z1WkNCM0xuTmpjbTlzYkZSdlhHNGdJQ0FnZHk1elkzSnZiR3dnUFNCM0xuTmpjbTlzYkZSdklEMGdablZ1WTNScGIyNG9LU0I3WEc0Z0lDQWdJQ0F2THlCaGRtOXBaQ0JoWTNScGIyNGdkMmhsYmlCdWJ5QmhjbWQxYldWdWRITWdZWEpsSUhCaGMzTmxaRnh1SUNBZ0lDQWdhV1lnS0dGeVozVnRaVzUwYzFzd1hTQTlQVDBnZFc1a1pXWnBibVZrS1NCN1hHNGdJQ0FnSUNBZ0lISmxkSFZ5Ymp0Y2JpQWdJQ0FnSUgxY2JseHVJQ0FnSUNBZ0x5OGdZWFp2YVdRZ2MyMXZiM1JvSUdKbGFHRjJhVzl5SUdsbUlHNXZkQ0J5WlhGMWFYSmxaRnh1SUNBZ0lDQWdhV1lnS0hOb2IzVnNaRUpoYVd4UGRYUW9ZWEpuZFcxbGJuUnpXekJkS1NBOVBUMGdkSEoxWlNrZ2UxeHVJQ0FnSUNBZ0lDQnZjbWxuYVc1aGJDNXpZM0p2Ykd3dVkyRnNiQ2hjYmlBZ0lDQWdJQ0FnSUNCM0xGeHVJQ0FnSUNBZ0lDQWdJR0Z5WjNWdFpXNTBjMXN3WFM1c1pXWjBJQ0U5UFNCMWJtUmxabWx1WldSY2JpQWdJQ0FnSUNBZ0lDQWdJRDhnWVhKbmRXMWxiblJ6V3pCZExteGxablJjYmlBZ0lDQWdJQ0FnSUNBZ0lEb2dkSGx3Wlc5bUlHRnlaM1Z0Wlc1MGMxc3dYU0FoUFQwZ0oyOWlhbVZqZENkY2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnUHlCaGNtZDFiV1Z1ZEhOYk1GMWNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ09pQjNMbk5qY205c2JGZ2dmSHdnZHk1d1lXZGxXRTltWm5ObGRDeGNiaUFnSUNBZ0lDQWdJQ0F2THlCMWMyVWdkRzl3SUhCeWIzQXNJSE5sWTI5dVpDQmhjbWQxYldWdWRDQnBaaUJ3Y21WelpXNTBJRzl5SUdaaGJHeGlZV05ySUhSdklITmpjbTlzYkZsY2JpQWdJQ0FnSUNBZ0lDQmhjbWQxYldWdWRITmJNRjB1ZEc5d0lDRTlQU0IxYm1SbFptbHVaV1JjYmlBZ0lDQWdJQ0FnSUNBZ0lEOGdZWEpuZFcxbGJuUnpXekJkTG5SdmNGeHVJQ0FnSUNBZ0lDQWdJQ0FnT2lCaGNtZDFiV1Z1ZEhOYk1WMGdJVDA5SUhWdVpHVm1hVzVsWkZ4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0EvSUdGeVozVnRaVzUwYzFzeFhWeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBNklIY3VjMk55YjJ4c1dTQjhmQ0IzTG5CaFoyVlpUMlptYzJWMFhHNGdJQ0FnSUNBZ0lDazdYRzVjYmlBZ0lDQWdJQ0FnY21WMGRYSnVPMXh1SUNBZ0lDQWdmVnh1WEc0Z0lDQWdJQ0F2THlCTVJWUWdWRWhGSUZOTlQwOVVTRTVGVTFNZ1FrVkhTVTRoWEc0Z0lDQWdJQ0J6Ylc5dmRHaFRZM0p2Ykd3dVkyRnNiQ2hjYmlBZ0lDQWdJQ0FnZHl4Y2JpQWdJQ0FnSUNBZ1pDNWliMlI1TEZ4dUlDQWdJQ0FnSUNCaGNtZDFiV1Z1ZEhOYk1GMHViR1ZtZENBaFBUMGdkVzVrWldacGJtVmtYRzRnSUNBZ0lDQWdJQ0FnUHlCK2ZtRnlaM1Z0Wlc1MGMxc3dYUzVzWldaMFhHNGdJQ0FnSUNBZ0lDQWdPaUIzTG5OamNtOXNiRmdnZkh3Z2R5NXdZV2RsV0U5bVpuTmxkQ3hjYmlBZ0lDQWdJQ0FnWVhKbmRXMWxiblJ6V3pCZExuUnZjQ0FoUFQwZ2RXNWtaV1pwYm1Wa1hHNGdJQ0FnSUNBZ0lDQWdQeUIrZm1GeVozVnRaVzUwYzFzd1hTNTBiM0JjYmlBZ0lDQWdJQ0FnSUNBNklIY3VjMk55YjJ4c1dTQjhmQ0IzTG5CaFoyVlpUMlptYzJWMFhHNGdJQ0FnSUNBcE8xeHVJQ0FnSUgwN1hHNWNiaUFnSUNBdkx5QjNMbk5qY205c2JFSjVYRzRnSUNBZ2R5NXpZM0p2Ykd4Q2VTQTlJR1oxYm1OMGFXOXVLQ2tnZTF4dUlDQWdJQ0FnTHk4Z1lYWnZhV1FnWVdOMGFXOXVJSGRvWlc0Z2JtOGdZWEpuZFcxbGJuUnpJR0Z5WlNCd1lYTnpaV1JjYmlBZ0lDQWdJR2xtSUNoaGNtZDFiV1Z1ZEhOYk1GMGdQVDA5SUhWdVpHVm1hVzVsWkNrZ2UxeHVJQ0FnSUNBZ0lDQnlaWFIxY200N1hHNGdJQ0FnSUNCOVhHNWNiaUFnSUNBZ0lDOHZJR0YyYjJsa0lITnRiMjkwYUNCaVpXaGhkbWx2Y2lCcFppQnViM1FnY21WeGRXbHlaV1JjYmlBZ0lDQWdJR2xtSUNoemFHOTFiR1JDWVdsc1QzVjBLR0Z5WjNWdFpXNTBjMXN3WFNrcElIdGNiaUFnSUNBZ0lDQWdiM0pwWjJsdVlXd3VjMk55YjJ4c1Fua3VZMkZzYkNoY2JpQWdJQ0FnSUNBZ0lDQjNMRnh1SUNBZ0lDQWdJQ0FnSUdGeVozVnRaVzUwYzFzd1hTNXNaV1owSUNFOVBTQjFibVJsWm1sdVpXUmNiaUFnSUNBZ0lDQWdJQ0FnSUQ4Z1lYSm5kVzFsYm5Seld6QmRMbXhsWm5SY2JpQWdJQ0FnSUNBZ0lDQWdJRG9nZEhsd1pXOW1JR0Z5WjNWdFpXNTBjMXN3WFNBaFBUMGdKMjlpYW1WamRDY2dQeUJoY21kMWJXVnVkSE5iTUYwZ09pQXdMRnh1SUNBZ0lDQWdJQ0FnSUdGeVozVnRaVzUwYzFzd1hTNTBiM0FnSVQwOUlIVnVaR1ZtYVc1bFpGeHVJQ0FnSUNBZ0lDQWdJQ0FnUHlCaGNtZDFiV1Z1ZEhOYk1GMHVkRzl3WEc0Z0lDQWdJQ0FnSUNBZ0lDQTZJR0Z5WjNWdFpXNTBjMXN4WFNBaFBUMGdkVzVrWldacGJtVmtJRDhnWVhKbmRXMWxiblJ6V3pGZElEb2dNRnh1SUNBZ0lDQWdJQ0FwTzF4dVhHNGdJQ0FnSUNBZ0lISmxkSFZ5Ymp0Y2JpQWdJQ0FnSUgxY2JseHVJQ0FnSUNBZ0x5OGdURVZVSUZSSVJTQlRUVTlQVkVoT1JWTlRJRUpGUjBsT0lWeHVJQ0FnSUNBZ2MyMXZiM1JvVTJOeWIyeHNMbU5oYkd3b1hHNGdJQ0FnSUNBZ0lIY3NYRzRnSUNBZ0lDQWdJR1F1WW05a2VTeGNiaUFnSUNBZ0lDQWdmbjVoY21kMWJXVnVkSE5iTUYwdWJHVm1kQ0FySUNoM0xuTmpjbTlzYkZnZ2ZId2dkeTV3WVdkbFdFOW1abk5sZENrc1hHNGdJQ0FnSUNBZ0lINStZWEpuZFcxbGJuUnpXekJkTG5SdmNDQXJJQ2gzTG5OamNtOXNiRmtnZkh3Z2R5NXdZV2RsV1U5bVpuTmxkQ2xjYmlBZ0lDQWdJQ2s3WEc0Z0lDQWdmVHRjYmx4dUlDQWdJQzh2SUVWc1pXMWxiblF1Y0hKdmRHOTBlWEJsTG5OamNtOXNiQ0JoYm1RZ1JXeGxiV1Z1ZEM1d2NtOTBiM1I1Y0dVdWMyTnliMnhzVkc5Y2JpQWdJQ0JGYkdWdFpXNTBMbkJ5YjNSdmRIbHdaUzV6WTNKdmJHd2dQU0JGYkdWdFpXNTBMbkJ5YjNSdmRIbHdaUzV6WTNKdmJHeFVieUE5SUdaMWJtTjBhVzl1S0NrZ2UxeHVJQ0FnSUNBZ0x5OGdZWFp2YVdRZ1lXTjBhVzl1SUhkb1pXNGdibThnWVhKbmRXMWxiblJ6SUdGeVpTQndZWE56WldSY2JpQWdJQ0FnSUdsbUlDaGhjbWQxYldWdWRITmJNRjBnUFQwOUlIVnVaR1ZtYVc1bFpDa2dlMXh1SUNBZ0lDQWdJQ0J5WlhSMWNtNDdYRzRnSUNBZ0lDQjlYRzVjYmlBZ0lDQWdJQzh2SUdGMmIybGtJSE50YjI5MGFDQmlaV2hoZG1sdmNpQnBaaUJ1YjNRZ2NtVnhkV2x5WldSY2JpQWdJQ0FnSUdsbUlDaHphRzkxYkdSQ1lXbHNUM1YwS0dGeVozVnRaVzUwYzFzd1hTa2dQVDA5SUhSeWRXVXBJSHRjYmlBZ0lDQWdJQ0FnTHk4Z2FXWWdiMjVsSUc1MWJXSmxjaUJwY3lCd1lYTnpaV1FzSUhSb2NtOTNJR1Z5Y205eUlIUnZJRzFoZEdOb0lFWnBjbVZtYjNnZ2FXMXdiR1Z0Wlc1MFlYUnBiMjVjYmlBZ0lDQWdJQ0FnYVdZZ0tIUjVjR1Z2WmlCaGNtZDFiV1Z1ZEhOYk1GMGdQVDA5SUNkdWRXMWlaWEluSUNZbUlHRnlaM1Z0Wlc1MGMxc3hYU0E5UFQwZ2RXNWtaV1pwYm1Wa0tTQjdYRzRnSUNBZ0lDQWdJQ0FnZEdoeWIzY2dibVYzSUZONWJuUmhlRVZ5Y205eUtDZFdZV3gxWlNCamIzVnNaQ0J1YjNRZ1ltVWdZMjl1ZG1WeWRHVmtKeWs3WEc0Z0lDQWdJQ0FnSUgxY2JseHVJQ0FnSUNBZ0lDQnZjbWxuYVc1aGJDNWxiR1Z0Wlc1MFUyTnliMnhzTG1OaGJHd29YRzRnSUNBZ0lDQWdJQ0FnZEdocGN5eGNiaUFnSUNBZ0lDQWdJQ0F2THlCMWMyVWdiR1ZtZENCd2NtOXdMQ0JtYVhKemRDQnVkVzFpWlhJZ1lYSm5kVzFsYm5RZ2IzSWdabUZzYkdKaFkyc2dkRzhnYzJOeWIyeHNUR1ZtZEZ4dUlDQWdJQ0FnSUNBZ0lHRnlaM1Z0Wlc1MGMxc3dYUzVzWldaMElDRTlQU0IxYm1SbFptbHVaV1JjYmlBZ0lDQWdJQ0FnSUNBZ0lEOGdmbjVoY21kMWJXVnVkSE5iTUYwdWJHVm1kRnh1SUNBZ0lDQWdJQ0FnSUNBZ09pQjBlWEJsYjJZZ1lYSm5kVzFsYm5Seld6QmRJQ0U5UFNBbmIySnFaV04wSnlBL0lINStZWEpuZFcxbGJuUnpXekJkSURvZ2RHaHBjeTV6WTNKdmJHeE1aV1owTEZ4dUlDQWdJQ0FnSUNBZ0lDOHZJSFZ6WlNCMGIzQWdjSEp2Y0N3Z2MyVmpiMjVrSUdGeVozVnRaVzUwSUc5eUlHWmhiR3hpWVdOcklIUnZJSE5qY205c2JGUnZjRnh1SUNBZ0lDQWdJQ0FnSUdGeVozVnRaVzUwYzFzd1hTNTBiM0FnSVQwOUlIVnVaR1ZtYVc1bFpGeHVJQ0FnSUNBZ0lDQWdJQ0FnUHlCK2ZtRnlaM1Z0Wlc1MGMxc3dYUzUwYjNCY2JpQWdJQ0FnSUNBZ0lDQWdJRG9nWVhKbmRXMWxiblJ6V3pGZElDRTlQU0IxYm1SbFptbHVaV1FnUHlCK2ZtRnlaM1Z0Wlc1MGMxc3hYU0E2SUhSb2FYTXVjMk55YjJ4c1ZHOXdYRzRnSUNBZ0lDQWdJQ2s3WEc1Y2JpQWdJQ0FnSUNBZ2NtVjBkWEp1TzF4dUlDQWdJQ0FnZlZ4dVhHNGdJQ0FnSUNCMllYSWdiR1ZtZENBOUlHRnlaM1Z0Wlc1MGMxc3dYUzVzWldaME8xeHVJQ0FnSUNBZ2RtRnlJSFJ2Y0NBOUlHRnlaM1Z0Wlc1MGMxc3dYUzUwYjNBN1hHNWNiaUFnSUNBZ0lDOHZJRXhGVkNCVVNFVWdVMDFQVDFSSVRrVlRVeUJDUlVkSlRpRmNiaUFnSUNBZ0lITnRiMjkwYUZOamNtOXNiQzVqWVd4c0tGeHVJQ0FnSUNBZ0lDQjBhR2x6TEZ4dUlDQWdJQ0FnSUNCMGFHbHpMRnh1SUNBZ0lDQWdJQ0IwZVhCbGIyWWdiR1ZtZENBOVBUMGdKM1Z1WkdWbWFXNWxaQ2NnUHlCMGFHbHpMbk5qY205c2JFeGxablFnT2lCK2ZteGxablFzWEc0Z0lDQWdJQ0FnSUhSNWNHVnZaaUIwYjNBZ1BUMDlJQ2QxYm1SbFptbHVaV1FuSUQ4Z2RHaHBjeTV6WTNKdmJHeFViM0FnT2lCK2ZuUnZjRnh1SUNBZ0lDQWdLVHRjYmlBZ0lDQjlPMXh1WEc0Z0lDQWdMeThnUld4bGJXVnVkQzV3Y205MGIzUjVjR1V1YzJOeWIyeHNRbmxjYmlBZ0lDQkZiR1Z0Wlc1MExuQnliM1J2ZEhsd1pTNXpZM0p2Ykd4Q2VTQTlJR1oxYm1OMGFXOXVLQ2tnZTF4dUlDQWdJQ0FnTHk4Z1lYWnZhV1FnWVdOMGFXOXVJSGRvWlc0Z2JtOGdZWEpuZFcxbGJuUnpJR0Z5WlNCd1lYTnpaV1JjYmlBZ0lDQWdJR2xtSUNoaGNtZDFiV1Z1ZEhOYk1GMGdQVDA5SUhWdVpHVm1hVzVsWkNrZ2UxeHVJQ0FnSUNBZ0lDQnlaWFIxY200N1hHNGdJQ0FnSUNCOVhHNWNiaUFnSUNBZ0lDOHZJR0YyYjJsa0lITnRiMjkwYUNCaVpXaGhkbWx2Y2lCcFppQnViM1FnY21WeGRXbHlaV1JjYmlBZ0lDQWdJR2xtSUNoemFHOTFiR1JDWVdsc1QzVjBLR0Z5WjNWdFpXNTBjMXN3WFNrZ1BUMDlJSFJ5ZFdVcElIdGNiaUFnSUNBZ0lDQWdiM0pwWjJsdVlXd3VaV3hsYldWdWRGTmpjbTlzYkM1allXeHNLRnh1SUNBZ0lDQWdJQ0FnSUhSb2FYTXNYRzRnSUNBZ0lDQWdJQ0FnWVhKbmRXMWxiblJ6V3pCZExteGxablFnSVQwOUlIVnVaR1ZtYVc1bFpGeHVJQ0FnSUNBZ0lDQWdJQ0FnUHlCK2ZtRnlaM1Z0Wlc1MGMxc3dYUzVzWldaMElDc2dkR2hwY3k1elkzSnZiR3hNWldaMFhHNGdJQ0FnSUNBZ0lDQWdJQ0E2SUg1K1lYSm5kVzFsYm5Seld6QmRJQ3NnZEdocGN5NXpZM0p2Ykd4TVpXWjBMRnh1SUNBZ0lDQWdJQ0FnSUdGeVozVnRaVzUwYzFzd1hTNTBiM0FnSVQwOUlIVnVaR1ZtYVc1bFpGeHVJQ0FnSUNBZ0lDQWdJQ0FnUHlCK2ZtRnlaM1Z0Wlc1MGMxc3dYUzUwYjNBZ0t5QjBhR2x6TG5OamNtOXNiRlJ2Y0Z4dUlDQWdJQ0FnSUNBZ0lDQWdPaUIrZm1GeVozVnRaVzUwYzFzeFhTQXJJSFJvYVhNdWMyTnliMnhzVkc5d1hHNGdJQ0FnSUNBZ0lDazdYRzVjYmlBZ0lDQWdJQ0FnY21WMGRYSnVPMXh1SUNBZ0lDQWdmVnh1WEc0Z0lDQWdJQ0IwYUdsekxuTmpjbTlzYkNoN1hHNGdJQ0FnSUNBZ0lHeGxablE2SUg1K1lYSm5kVzFsYm5Seld6QmRMbXhsWm5RZ0t5QjBhR2x6TG5OamNtOXNiRXhsWm5Rc1hHNGdJQ0FnSUNBZ0lIUnZjRG9nZm41aGNtZDFiV1Z1ZEhOYk1GMHVkRzl3SUNzZ2RHaHBjeTV6WTNKdmJHeFViM0FzWEc0Z0lDQWdJQ0FnSUdKbGFHRjJhVzl5T2lCaGNtZDFiV1Z1ZEhOYk1GMHVZbVZvWVhacGIzSmNiaUFnSUNBZ0lIMHBPMXh1SUNBZ0lIMDdYRzVjYmlBZ0lDQXZMeUJGYkdWdFpXNTBMbkJ5YjNSdmRIbHdaUzV6WTNKdmJHeEpiblJ2Vm1sbGQxeHVJQ0FnSUVWc1pXMWxiblF1Y0hKdmRHOTBlWEJsTG5OamNtOXNiRWx1ZEc5V2FXVjNJRDBnWm5WdVkzUnBiMjRvS1NCN1hHNGdJQ0FnSUNBdkx5QmhkbTlwWkNCemJXOXZkR2dnWW1Wb1lYWnBiM0lnYVdZZ2JtOTBJSEpsY1hWcGNtVmtYRzRnSUNBZ0lDQnBaaUFvYzJodmRXeGtRbUZwYkU5MWRDaGhjbWQxYldWdWRITmJNRjBwSUQwOVBTQjBjblZsS1NCN1hHNGdJQ0FnSUNBZ0lHOXlhV2RwYm1Gc0xuTmpjbTlzYkVsdWRHOVdhV1YzTG1OaGJHd29YRzRnSUNBZ0lDQWdJQ0FnZEdocGN5eGNiaUFnSUNBZ0lDQWdJQ0JoY21kMWJXVnVkSE5iTUYwZ1BUMDlJSFZ1WkdWbWFXNWxaQ0EvSUhSeWRXVWdPaUJoY21kMWJXVnVkSE5iTUYxY2JpQWdJQ0FnSUNBZ0tUdGNibHh1SUNBZ0lDQWdJQ0J5WlhSMWNtNDdYRzRnSUNBZ0lDQjlYRzVjYmlBZ0lDQWdJQzh2SUV4RlZDQlVTRVVnVTAxUFQxUklUa1ZUVXlCQ1JVZEpUaUZjYmlBZ0lDQWdJSFpoY2lCelkzSnZiR3hoWW14bFVHRnlaVzUwSUQwZ1ptbHVaRk5qY205c2JHRmliR1ZRWVhKbGJuUW9kR2hwY3lrN1hHNGdJQ0FnSUNCMllYSWdjR0Z5Wlc1MFVtVmpkSE1nUFNCelkzSnZiR3hoWW14bFVHRnlaVzUwTG1kbGRFSnZkVzVrYVc1blEyeHBaVzUwVW1WamRDZ3BPMXh1SUNBZ0lDQWdkbUZ5SUdOc2FXVnVkRkpsWTNSeklEMGdkR2hwY3k1blpYUkNiM1Z1WkdsdVowTnNhV1Z1ZEZKbFkzUW9LVHRjYmx4dUlDQWdJQ0FnYVdZZ0tITmpjbTlzYkdGaWJHVlFZWEpsYm5RZ0lUMDlJR1F1WW05a2VTa2dlMXh1SUNBZ0lDQWdJQ0F2THlCeVpYWmxZV3dnWld4bGJXVnVkQ0JwYm5OcFpHVWdjR0Z5Wlc1MFhHNGdJQ0FnSUNBZ0lITnRiMjkwYUZOamNtOXNiQzVqWVd4c0tGeHVJQ0FnSUNBZ0lDQWdJSFJvYVhNc1hHNGdJQ0FnSUNBZ0lDQWdjMk55YjJ4c1lXSnNaVkJoY21WdWRDeGNiaUFnSUNBZ0lDQWdJQ0J6WTNKdmJHeGhZbXhsVUdGeVpXNTBMbk5qY205c2JFeGxablFnS3lCamJHbGxiblJTWldOMGN5NXNaV1owSUMwZ2NHRnlaVzUwVW1WamRITXViR1ZtZEN4Y2JpQWdJQ0FnSUNBZ0lDQnpZM0p2Ykd4aFlteGxVR0Z5Wlc1MExuTmpjbTlzYkZSdmNDQXJJR05zYVdWdWRGSmxZM1J6TG5SdmNDQXRJSEJoY21WdWRGSmxZM1J6TG5SdmNGeHVJQ0FnSUNBZ0lDQXBPMXh1WEc0Z0lDQWdJQ0FnSUM4dklISmxkbVZoYkNCd1lYSmxiblFnYVc0Z2RtbGxkM0J2Y25RZ2RXNXNaWE56SUdseklHWnBlR1ZrWEc0Z0lDQWdJQ0FnSUdsbUlDaDNMbWRsZEVOdmJYQjFkR1ZrVTNSNWJHVW9jMk55YjJ4c1lXSnNaVkJoY21WdWRDa3VjRzl6YVhScGIyNGdJVDA5SUNkbWFYaGxaQ2NwSUh0Y2JpQWdJQ0FnSUNBZ0lDQjNMbk5qY205c2JFSjVLSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lHeGxablE2SUhCaGNtVnVkRkpsWTNSekxteGxablFzWEc0Z0lDQWdJQ0FnSUNBZ0lDQjBiM0E2SUhCaGNtVnVkRkpsWTNSekxuUnZjQ3hjYmlBZ0lDQWdJQ0FnSUNBZ0lHSmxhR0YyYVc5eU9pQW5jMjF2YjNSb0oxeHVJQ0FnSUNBZ0lDQWdJSDBwTzF4dUlDQWdJQ0FnSUNCOVhHNGdJQ0FnSUNCOUlHVnNjMlVnZTF4dUlDQWdJQ0FnSUNBdkx5QnlaWFpsWVd3Z1pXeGxiV1Z1ZENCcGJpQjJhV1YzY0c5eWRGeHVJQ0FnSUNBZ0lDQjNMbk5qY205c2JFSjVLSHRjYmlBZ0lDQWdJQ0FnSUNCc1pXWjBPaUJqYkdsbGJuUlNaV04wY3k1c1pXWjBMRnh1SUNBZ0lDQWdJQ0FnSUhSdmNEb2dZMnhwWlc1MFVtVmpkSE11ZEc5d0xGeHVJQ0FnSUNBZ0lDQWdJR0psYUdGMmFXOXlPaUFuYzIxdmIzUm9KMXh1SUNBZ0lDQWdJQ0I5S1R0Y2JpQWdJQ0FnSUgxY2JpQWdJQ0I5TzF4dUlDQjlYRzVjYmlBZ2FXWWdLSFI1Y0dWdlppQmxlSEJ2Y25SeklEMDlQU0FuYjJKcVpXTjBKeUFtSmlCMGVYQmxiMllnYlc5a2RXeGxJQ0U5UFNBbmRXNWtaV1pwYm1Wa0p5a2dlMXh1SUNBZ0lDOHZJR052YlcxdmJtcHpYRzRnSUNBZ2JXOWtkV3hsTG1WNGNHOXlkSE1nUFNCN0lIQnZiSGxtYVd4c09pQndiMng1Wm1sc2JDQjlPMXh1SUNCOUlHVnNjMlVnZTF4dUlDQWdJQzh2SUdkc2IySmhiRnh1SUNBZ0lIQnZiSGxtYVd4c0tDazdYRzRnSUgxY2JseHVmU2dwS1R0Y2JpSXNJbU52Ym5OMElFUkNJRDBnSjJoMGRIQnpPaTh2Ym1WNGRYTXRZMkYwWVd4dlp5NW1hWEpsWW1GelpXbHZMbU52YlM5d2IzTjBjeTVxYzI5dVAyRjFkR2c5TjJjM2NIbExTM2xyVGpOT05XVjNja2x0YUU5aFV6WjJkM0pHYzJNMVprdHJjbXM0WldwNlppYzdYRzVjYm1OdmJuTjBJQ1JzYjJGa2FXNW5JRDBnUVhKeVlYa3Vabkp2YlNoa2IyTjFiV1Z1ZEM1eGRXVnllVk5sYkdWamRHOXlRV3hzS0NjdWJHOWhaR2x1WnljcEtUdGNibU52Ym5OMElDUmhjblJwWTJ4bFRHbHpkQ0E5SUdSdlkzVnRaVzUwTG1kbGRFVnNaVzFsYm5SQ2VVbGtLQ2RxY3kxc2FYTjBKeWs3WEc1amIyNXpkQ0FrYm1GMklEMGdaRzlqZFcxbGJuUXVaMlYwUld4bGJXVnVkRUo1U1dRb0oycHpMVzVoZGljcE8xeHVZMjl1YzNRZ0pIQmhjbUZzYkdGNElEMGdaRzlqZFcxbGJuUXVjWFZsY25sVFpXeGxZM1J2Y2lnbkxuQmhjbUZzYkdGNEp5azdYRzVqYjI1emRDQWtZMjl1ZEdWdWRDQTlJR1J2WTNWdFpXNTBMbkYxWlhKNVUyVnNaV04wYjNJb0p5NWpiMjUwWlc1MEp5azdYRzVqYjI1emRDQWtkR2wwYkdVZ1BTQmtiMk4xYldWdWRDNW5aWFJGYkdWdFpXNTBRbmxKWkNnbmFuTXRkR2wwYkdVbktUdGNibU52Ym5OMElDUjFjRUZ5Y205M0lEMGdaRzlqZFcxbGJuUXVaMlYwUld4bGJXVnVkRUo1U1dRb0oycHpMV0Z5Y205M0p5azdYRzVqYjI1emRDQWtiVzlrWVd3Z1BTQmtiMk4xYldWdWRDNXhkV1Z5ZVZObGJHVmpkRzl5S0NjdWJXOWtZV3duS1R0Y2JtTnZibk4wSUNSc2FXZG9kR0p2ZUNBOUlHUnZZM1Z0Wlc1MExuRjFaWEo1VTJWc1pXTjBiM0lvSnk1c2FXZG9kR0p2ZUNjcE8xeHVZMjl1YzNRZ0pIWnBaWGNnUFNCa2IyTjFiV1Z1ZEM1eGRXVnllVk5sYkdWamRHOXlLQ2N1YkdsbmFIUmliM2d0ZG1sbGR5Y3BPMXh1WTI5dWMzUWdjMjl5ZEVsa2N5QTlJRnNuWVhKMGFYTjBKeXdnSjNScGRHeGxKMTA3WEc1Y2JtVjRjRzl5ZENCN0lGeHVYSFJFUWl4Y2JseDBKR3h2WVdScGJtY3NYRzVjZENSaGNuUnBZMnhsVEdsemRDd2dYRzVjZENSdVlYWXNJRnh1WEhRa2NHRnlZV3hzWVhnc1hHNWNkQ1JqYjI1MFpXNTBMRnh1WEhRa2RHbDBiR1VzWEc1Y2RDUjFjRUZ5Y205M0xGeHVYSFFrYlc5a1lXd3NYRzVjZENSc2FXZG9kR0p2ZUN4Y2JseDBKSFpwWlhjc1hHNWNkSE52Y25SSlpITmNibjA3SWl3aWFXMXdiM0owSUhOdGIyOTBhSE5qY205c2JDQm1jbTl0SUNkemJXOXZkR2h6WTNKdmJHd3RjRzlzZVdacGJHd25PMXh1WEc1cGJYQnZjblFnZXlCaGNuUnBZMnhsVkdWdGNHeGhkR1VzSUhKbGJtUmxjazVoZGt4bklIMGdabkp2YlNBbkxpOTBaVzF3YkdGMFpYTW5PMXh1YVcxd2IzSjBJSHNnWkdWaWIzVnVZMlVzSUdocFpHVk1iMkZrYVc1bkxDQnpZM0p2Ykd4VWIxUnZjQ0I5SUdaeWIyMGdKeTR2ZFhScGJITW5PMXh1YVcxd2IzSjBJSHNnUkVJc0lDUmhjblJwWTJ4bFRHbHpkQ3dnYzI5eWRFbGtjeUI5SUdaeWIyMGdKeTR2WTI5dWMzUmhiblJ6Snp0Y2JtbHRjRzl5ZENCN0lHRjBkR0ZqYUUxdlpHRnNUR2x6ZEdWdVpYSnpMQ0JoZEhSaFkyaFZjRUZ5Y205M1RHbHpkR1Z1WlhKekxDQmhkSFJoWTJoSmJXRm5aVXhwYzNSbGJtVnljeXdnYldGclpVRnNjR2hoWW1WMExDQnRZV3RsVTJ4cFpHVnlJSDBnWm5KdmJTQW5MaTl0YjJSMWJHVnpKenRjYmx4dWJHVjBJSE52Y25STFpYa2dQU0F3T3lBdkx5QXdJRDBnWVhKMGFYTjBMQ0F4SUQwZ2RHbDBiR1ZjYm14bGRDQmxiblJ5YVdWeklEMGdleUJpZVVGMWRHaHZjam9nVzEwc0lHSjVWR2wwYkdVNklGdGRJSDA3WEc1Y2JtTnZibk4wSUhObGRGVndVMjl5ZEVKMWRIUnZibk1nUFNBb0tTQTlQaUI3WEc1Y2RITnZjblJKWkhNdVptOXlSV0ZqYUNocFpDQTlQaUI3WEc1Y2RGeDBZMjl1YzNRZ1lXeDBJRDBnYVdRZ1BUMDlJQ2RoY25ScGMzUW5JRDhnSjNScGRHeGxKeUE2SUNkaGNuUnBjM1FuTzF4dVhHNWNkRngwWTI5dWMzUWdKR0oxZEhSdmJpQTlJR1J2WTNWdFpXNTBMbWRsZEVWc1pXMWxiblJDZVVsa0tHQnFjeTFpZVMwa2UybGtmV0FwTzF4dVhIUmNkR052Ym5OMElDUmhiSFJDZFhSMGIyNGdQU0JrYjJOMWJXVnVkQzVuWlhSRmJHVnRaVzUwUW5sSlpDaGdhbk10WW5rdEpIdGhiSFI5WUNrN1hHNWNibHgwWEhRa1luVjBkRzl1TG1Ga1pFVjJaVzUwVEdsemRHVnVaWElvSjJOc2FXTnJKeXdnS0NrZ1BUNGdlMXh1WEhSY2RGeDBjMk55YjJ4c1ZHOVViM0FvS1R0Y2JseDBYSFJjZEhOdmNuUkxaWGtnUFNBaGMyOXlkRXRsZVR0Y2JseDBYSFJjZEhKbGJtUmxja1Z1ZEhKcFpYTW9LVHRjYmx4dVhIUmNkRngwSkdKMWRIUnZiaTVqYkdGemMweHBjM1F1WVdSa0tDZGhZM1JwZG1VbktUdGNibHgwWEhSY2RDUmhiSFJDZFhSMGIyNHVZMnhoYzNOTWFYTjBMbkpsYlc5MlpTZ25ZV04wYVhabEp5azdYRzVjZEZ4MGZTbGNibHgwZlNrN1hHNTlPMXh1WEc1amIyNXpkQ0J5Wlc1a1pYSkZiblJ5YVdWeklEMGdLQ2tnUFQ0Z2UxeHVYSFJqYjI1emRDQmxiblJ5YVdWelRHbHpkQ0E5SUhOdmNuUkxaWGtnUHlCbGJuUnlhV1Z6TG1KNVZHbDBiR1VnT2lCbGJuUnlhV1Z6TG1KNVFYVjBhRzl5TzF4dVhHNWNkQ1JoY25ScFkyeGxUR2x6ZEM1cGJtNWxja2hVVFV3Z1BTQW5KenRjYmx4dVhIUmxiblJ5YVdWelRHbHpkQzVtYjNKRllXTm9LQ2hsYm5SeWVTd2dhU2tnUFQ0Z2UxeHVYSFJjZENSaGNuUnBZMnhsVEdsemRDNXBibk5sY25SQlpHcGhZMlZ1ZEVoVVRVd29KMkpsWm05eVpXVnVaQ2NzSUdGeWRHbGpiR1ZVWlcxd2JHRjBaU2hsYm5SeWVTd2dhU2twTzF4dVhIUmNkRzFoYTJWVGJHbGtaWElvWkc5amRXMWxiblF1WjJWMFJXeGxiV1Z1ZEVKNVNXUW9ZSE5zYVdSbGNpMGtlMmw5WUNrcE8xeHVYSFI5S1R0Y2JseHVYSFJwWmlBb2QybHVaRzkzTG5OamNtVmxiaTUzYVdSMGFDQStJRGMyT0NrZ1lYUjBZV05vU1cxaFoyVk1hWE4wWlc1bGNuTW9LVHRjYmx4MGJXRnJaVUZzY0doaFltVjBLSE52Y25STFpYa3BPMXh1ZlR0Y2JseHVZMjl1YzNRZ2MyVjBSR0YwWVVGdVpGTnZjblJDZVZScGRHeGxJRDBnS0dSaGRHRXBJRDArSUh0Y2JseDBaVzUwY21sbGN5NWllVUYxZEdodmNpQTlJR1JoZEdFN1hHNWNkR1Z1ZEhKcFpYTXVZbmxVYVhSc1pTQTlJR1JoZEdFdWMyeHBZMlVvS1RzZ0x5OGdZMjl3YVdWeklHUmhkR0VnWm05eUlHSjVWR2wwYkdVZ2MyOXlkRnh1WEc1Y2RHVnVkSEpwWlhNdVlubFVhWFJzWlM1emIzSjBLQ2hoTENCaUtTQTlQaUI3WEc1Y2RGeDBiR1YwSUdGVWFYUnNaU0E5SUdFdWRHbDBiR1ZiTUYwdWRHOVZjSEJsY2tOaGMyVW9LVHRjYmx4MFhIUnNaWFFnWWxScGRHeGxJRDBnWWk1MGFYUnNaVnN3WFM1MGIxVndjR1Z5UTJGelpTZ3BPMXh1WEhSY2RHbG1JQ2hoVkdsMGJHVWdQaUJpVkdsMGJHVXBJSEpsZEhWeWJpQXhPMXh1WEhSY2RHVnNjMlVnYVdZZ0tHRlVhWFJzWlNBOElHSlVhWFJzWlNrZ2NtVjBkWEp1SUMweE8xeHVYSFJjZEdWc2MyVWdjbVYwZFhKdUlEQTdYRzVjZEgwcE8xeHVmVHRjYmx4dVkyOXVjM1FnWm1WMFkyaEVZWFJoSUQwZ0tDa2dQVDRnZTF4dVhIUm1aWFJqYUNoRVFpa3VkR2hsYmloeVpYTWdQVDRnY21WekxtcHpiMjRvS1NsY2JseDBMblJvWlc0b1pHRjBZU0E5UGlCN1hHNWNkRngwYzJWMFJHRjBZVUZ1WkZOdmNuUkNlVlJwZEd4bEtHUmhkR0VwTzF4dVhIUmNkSEpsYm1SbGNrVnVkSEpwWlhNb0tUdGNibHgwWEhSb2FXUmxURzloWkdsdVp5Z3BPMXh1WEhSOUtWeHVYSFF1WTJGMFkyZ29aWEp5SUQwK0lHTnZibk52YkdVdWQyRnliaWhsY25JcEtUdGNibjA3WEc1Y2JtTnZibk4wSUdsdWFYUWdQU0FvS1NBOVBpQjdYRzVjZEhOdGIyOTBhSE5qY205c2JDNXdiMng1Wm1sc2JDZ3BPMXh1WEhSbVpYUmphRVJoZEdFb0tUdGNibHgwY21WdVpHVnlUbUYyVEdjb0tUdGNibHgwYzJWMFZYQlRiM0owUW5WMGRHOXVjeWdwTzF4dVhIUmhkSFJoWTJoVmNFRnljbTkzVEdsemRHVnVaWEp6S0NrN1hHNWNkR0YwZEdGamFFMXZaR0ZzVEdsemRHVnVaWEp6S0NrN1hHNTlPMXh1WEc1cGJtbDBLQ2s3WEc0aUxDSnBiWEJ2Y25RZ2V5QWtkbWxsZHl3Z0pHeHBaMmgwWW05NElIMGdabkp2YlNBbkxpNHZZMjl1YzNSaGJuUnpKenRjYmx4dWJHVjBJR3hwWjJoMFltOTRJRDBnWm1Gc2MyVTdYRzVzWlhRZ2VESWdQU0JtWVd4elpUdGNibXhsZENCMmFXVjNRMnhoYzNNN1hHNWNibU52Ym5OMElHRjBkR0ZqYUVsdFlXZGxUR2x6ZEdWdVpYSnpJRDBnS0NrZ1BUNGdlMXh1WEhSamIyNXpkQ0FrYVcxaFoyVnpJRDBnUVhKeVlYa3Vabkp2YlNoa2IyTjFiV1Z1ZEM1eGRXVnllVk5sYkdWamRHOXlRV3hzS0NjdVlYSjBhV05zWlMxcGJXRm5aU2NwS1R0Y2JseHVYSFFrYVcxaFoyVnpMbVp2Y2tWaFkyZ29hVzFuSUQwK0lIdGNibHgwWEhScGJXY3VZV1JrUlhabGJuUk1hWE4wWlc1bGNpZ25ZMnhwWTJzbkxDQW9aWFowS1NBOVBpQjdYRzVjZEZ4MFhIUnBaaUFvSVd4cFoyaDBZbTk0S1NCN1hHNWNkRngwWEhSY2RDUnNhV2RvZEdKdmVDNWpiR0Z6YzB4cGMzUXVZV1JrS0NkemFHOTNMV2x0WnljcE8xeHVYSFJjZEZ4MFhIUWtkbWxsZHk1emNtTWdQU0JwYldjdWMzSmpPMXh1WEhSY2RGeDBYSFJzYVdkb2RHSnZlQ0E5SUhSeWRXVTdYRzVjZEZ4MFhIUjlYRzVjZEZ4MGZTazdYRzVjZEgwcE8xeHVYRzVjZENSc2FXZG9kR0p2ZUM1aFpHUkZkbVZ1ZEV4cGMzUmxibVZ5S0NkamJHbGpheWNzSUNobGRuUXBJRDArSUh0Y2JseDBYSFJwWmlBb1pYWjBMblJoY21kbGRDQTlQVDBnSkhacFpYY3BJSEpsZEhWeWJqdGNibHgwWEhRa2JHbG5hSFJpYjNndVkyeGhjM05NYVhOMExuSmxiVzkyWlNnbmMyaHZkeTFwYldjbktUdGNibHgwWEhSc2FXZG9kR0p2ZUNBOUlHWmhiSE5sTzF4dVhIUjlLVHRjYmx4dVhIUWtkbWxsZHk1aFpHUkZkbVZ1ZEV4cGMzUmxibVZ5S0NkamJHbGpheWNzSUNncElEMCtJSHRjYmx4MFhIUnBaaUFvSVhneUtTQjdYRzVjZEZ4MFhIUjJhV1YzUTJ4aGMzTWdQU0FrZG1sbGR5NTNhV1IwYUNBOElIZHBibVJ2ZHk1cGJtNWxjbGRwWkhSb0lEOGdKM1pwWlhjdGVESXRMWE50SnlBNklDZDJhV1YzTFhneUp6dGNibHgwWEhSY2RDUjJhV1YzTG1Oc1lYTnpUR2x6ZEM1aFpHUW9kbWxsZDBOc1lYTnpLVHRjYmx4MFhIUmNkSE5sZEZScGJXVnZkWFFvS0NrZ1BUNGdlRElnUFNCMGNuVmxMQ0F6TURBcE8xeHVYSFJjZEgwZ1pXeHpaU0I3WEc1Y2RGeDBYSFFrZG1sbGR5NWpiR0Z6YzB4cGMzUXVjbVZ0YjNabEtIWnBaWGREYkdGemN5azdYRzVjZEZ4MFhIUWtiR2xuYUhSaWIzZ3VZMnhoYzNOTWFYTjBMbkpsYlc5MlpTZ25jMmh2ZHkxcGJXY25LVHRjYmx4MFhIUmNkSGd5SUQwZ1ptRnNjMlU3WEc1Y2RGeDBYSFJzYVdkb2RHSnZlQ0E5SUdaaGJITmxPMXh1WEhSY2RIMWNibHgwZlNrN1hHNTlPMXh1WEc1bGVIQnZjblFnWkdWbVlYVnNkQ0JoZEhSaFkyaEpiV0ZuWlV4cGMzUmxibVZ5Y3pzaUxDSnBiWEJ2Y25RZ2V5QWtiVzlrWVd3Z2ZTQm1jbTl0SUNjdUxpOWpiMjV6ZEdGdWRITW5PMXh1WEc1c1pYUWdiVzlrWVd3Z1BTQm1ZV3h6WlR0Y2JtTnZibk4wSUdGMGRHRmphRTF2WkdGc1RHbHpkR1Z1WlhKeklEMGdLQ2tnUFQ0Z2UxeHVYSFJqYjI1emRDQWtabWx1WkNBOUlHUnZZM1Z0Wlc1MExtZGxkRVZzWlcxbGJuUkNlVWxrS0NkcWN5MW1hVzVrSnlrN1hHNWNkRnh1WEhRa1ptbHVaQzVoWkdSRmRtVnVkRXhwYzNSbGJtVnlLQ2RqYkdsamF5Y3NJQ2dwSUQwK0lIdGNibHgwWEhRa2JXOWtZV3d1WTJ4aGMzTk1hWE4wTG1Ga1pDZ25jMmh2ZHljcE8xeHVYSFJjZEcxdlpHRnNJRDBnZEhKMVpUdGNibHgwZlNrN1hHNWNibHgwSkcxdlpHRnNMbUZrWkVWMlpXNTBUR2x6ZEdWdVpYSW9KMk5zYVdOckp5d2dLQ2tnUFQ0Z2UxeHVYSFJjZENSdGIyUmhiQzVqYkdGemMweHBjM1F1Y21WdGIzWmxLQ2R6YUc5M0p5azdYRzVjZEZ4MGJXOWtZV3dnUFNCbVlXeHpaVHRjYmx4MGZTazdYRzVjYmx4MGQybHVaRzkzTG1Ga1pFVjJaVzUwVEdsemRHVnVaWElvSjJ0bGVXUnZkMjRuTENBb0tTQTlQaUI3WEc1Y2RGeDBhV1lnS0cxdlpHRnNLU0I3WEc1Y2RGeDBYSFJ6WlhSVWFXMWxiM1YwS0NncElEMCtJSHRjYmx4MFhIUmNkRngwSkcxdlpHRnNMbU5zWVhOelRHbHpkQzV5WlcxdmRtVW9KM05vYjNjbktUdGNibHgwWEhSY2RGeDBiVzlrWVd3Z1BTQm1ZV3h6WlR0Y2JseDBYSFJjZEgwc0lEWXdNQ2s3WEc1Y2RGeDBmVHRjYmx4MGZTazdYRzU5TzF4dVhHNWxlSEJ2Y25RZ1pHVm1ZWFZzZENCaGRIUmhZMmhOYjJSaGJFeHBjM1JsYm1WeWN6c2lMQ0pwYlhCdmNuUWdleUFrZEdsMGJHVXNJQ1J3WVhKaGJHeGhlQ3dnSkhWd1FYSnliM2NnZlNCbWNtOXRJQ2N1TGk5amIyNXpkR0Z1ZEhNbk8xeHVhVzF3YjNKMElIc2djMk55YjJ4c1ZHOVViM0FnZlNCbWNtOXRJQ2N1TGk5MWRHbHNjeWM3WEc1Y2JteGxkQ0J3Y21WMk8xeHViR1YwSUdOMWNuSmxiblFnUFNBd08xeHViR1YwSUdselUyaHZkMmx1WnlBOUlHWmhiSE5sTzF4dVhHNWpiMjV6ZENCaGRIUmhZMmhWY0VGeWNtOTNUR2x6ZEdWdVpYSnpJRDBnS0NrZ1BUNGdlMXh1WEhRa2NHRnlZV3hzWVhndVlXUmtSWFpsYm5STWFYTjBaVzVsY2lnbmMyTnliMnhzSnl3Z0tDa2dQVDRnZTF4dVhIUmNkR3hsZENCNUlEMGdKSFJwZEd4bExtZGxkRUp2ZFc1a2FXNW5RMnhwWlc1MFVtVmpkQ2dwTG5rN1hHNWNibHgwWEhScFppQW9ZM1Z5Y21WdWRDQWhQVDBnZVNrZ2UxeHVYSFJjZEZ4MGNISmxkaUE5SUdOMWNuSmxiblE3WEc1Y2RGeDBYSFJqZFhKeVpXNTBJRDBnZVR0Y2JseDBYSFI5TzF4dVhHNWNkRngwYVdZZ0tIa2dQRDBnTFRVd0lDWW1JQ0ZwYzFOb2IzZHBibWNwSUh0Y2JseDBYSFJjZENSMWNFRnljbTkzTG1Oc1lYTnpUR2x6ZEM1aFpHUW9KM05vYjNjbktUdGNibHgwWEhSY2RHbHpVMmh2ZDJsdVp5QTlJSFJ5ZFdVN1hHNWNkRngwZlNCbGJITmxJR2xtSUNoNUlENGdMVFV3SUNZbUlHbHpVMmh2ZDJsdVp5a2dlMXh1WEhSY2RGeDBKSFZ3UVhKeWIzY3VZMnhoYzNOTWFYTjBMbkpsYlc5MlpTZ25jMmh2ZHljcE8xeHVYSFJjZEZ4MGFYTlRhRzkzYVc1bklEMGdabUZzYzJVN1hHNWNkRngwZlZ4dVhIUjlLVHRjYmx4dVhIUWtkWEJCY25KdmR5NWhaR1JGZG1WdWRFeHBjM1JsYm1WeUtDZGpiR2xqYXljc0lDZ3BJRDArSUhOamNtOXNiRlJ2Vkc5d0tDa3BPMXh1ZlR0Y2JseHVaWGh3YjNKMElHUmxabUYxYkhRZ1lYUjBZV05vVlhCQmNuSnZkMHhwYzNSbGJtVnljenNpTENKcGJYQnZjblFnWVhSMFlXTm9UVzlrWVd4TWFYTjBaVzVsY25NZ1puSnZiU0FuTGk5aGRIUmhZMmhOYjJSaGJFeHBjM1JsYm1WeWN5YzdYRzVwYlhCdmNuUWdZWFIwWVdOb1ZYQkJjbkp2ZDB4cGMzUmxibVZ5Y3lCbWNtOXRJQ2N1TDJGMGRHRmphRlZ3UVhKeWIzZE1hWE4wWlc1bGNuTW5PMXh1YVcxd2IzSjBJR0YwZEdGamFFbHRZV2RsVEdsemRHVnVaWEp6SUdaeWIyMGdKeTR2WVhSMFlXTm9TVzFoWjJWTWFYTjBaVzVsY25Nbk8xeHVhVzF3YjNKMElHMWhhMlZCYkhCb1lXSmxkQ0JtY205dElDY3VMMjFoYTJWQmJIQm9ZV0psZENjN1hHNXBiWEJ2Y25RZ2JXRnJaVk5zYVdSbGNpQm1jbTl0SUNjdUwyMWhhMlZUYkdsa1pYSW5PMXh1WEc1bGVIQnZjblFnZXlCY2JseDBZWFIwWVdOb1RXOWtZV3hNYVhOMFpXNWxjbk1zSUZ4dVhIUmhkSFJoWTJoVmNFRnljbTkzVEdsemRHVnVaWEp6TEZ4dVhIUmhkSFJoWTJoSmJXRm5aVXhwYzNSbGJtVnljeXhjYmx4MGJXRnJaVUZzY0doaFltVjBMQ0JjYmx4MGJXRnJaVk5zYVdSbGNpQmNibjA3SWl3aVkyOXVjM1FnWVd4d2FHRmlaWFFnUFNCYkoyRW5MQ0FuWWljc0lDZGpKeXdnSjJRbkxDQW5aU2NzSUNkbUp5d2dKMmNuTENBbmFDY3NJQ2RwSnl3Z0oyb25MQ0FuYXljc0lDZHNKeXdnSjIwbkxDQW5iaWNzSUNkdkp5d2dKM0FuTENBbmNpY3NJQ2R6Snl3Z0ozUW5MQ0FuZFNjc0lDZDJKeXdnSjNjbkxDQW5lU2NzSUNkNkoxMDdYRzVjYm1OdmJuTjBJRzFoYTJWQmJIQm9ZV0psZENBOUlDaHpiM0owUzJWNUtTQTlQaUI3WEc1Y2RHTnZibk4wSUdacGJtUkdhWEp6ZEVWdWRISjVJRDBnS0dOb1lYSXBJRDArSUh0Y2JseDBYSFJqYjI1emRDQnpaV3hsWTNSdmNpQTlJSE52Y25STFpYa2dQeUFuTG1wekxXVnVkSEo1TFhScGRHeGxKeUE2SUNjdWFuTXRaVzUwY25rdFlYSjBhWE4wSnp0Y2JseDBYSFJqYjI1emRDQndjbVYyVTJWc1pXTjBiM0lnUFNBaGMyOXlkRXRsZVNBL0lDY3Vhbk10Wlc1MGNua3RkR2wwYkdVbklEb2dKeTVxY3kxbGJuUnllUzFoY25ScGMzUW5PMXh1WEc1Y2RGeDBZMjl1YzNRZ0pHVnVkSEpwWlhNZ1BTQkJjbkpoZVM1bWNtOXRLR1J2WTNWdFpXNTBMbkYxWlhKNVUyVnNaV04wYjNKQmJHd29jMlZzWldOMGIzSXBLVHRjYmx4MFhIUmpiMjV6ZENBa2NISmxka1Z1ZEhKcFpYTWdQU0JCY25KaGVTNW1jbTl0S0dSdlkzVnRaVzUwTG5GMVpYSjVVMlZzWldOMGIzSkJiR3dvY0hKbGRsTmxiR1ZqZEc5eUtTazdYRzVjYmx4MFhIUWtjSEpsZGtWdWRISnBaWE11Wm05eVJXRmphQ2hsYm5SeWVTQTlQaUJsYm5SeWVTNXlaVzF2ZG1WQmRIUnlhV0oxZEdVb0oyNWhiV1VuS1NrN1hHNWNibHgwWEhSeVpYUjFjbTRnSkdWdWRISnBaWE11Wm1sdVpDaGxiblJ5ZVNBOVBpQjdYRzVjZEZ4MFhIUnNaWFFnYm05a1pTQTlJR1Z1ZEhKNUxtNWxlSFJGYkdWdFpXNTBVMmxpYkdsdVp6dGNibHgwWEhSY2RISmxkSFZ5YmlCdWIyUmxMbWx1Ym1WeVNGUk5URnN3WFNBOVBUMGdZMmhoY2lCOGZDQnViMlJsTG1sdWJtVnlTRlJOVEZzd1hTQTlQVDBnWTJoaGNpNTBiMVZ3Y0dWeVEyRnpaU2dwTzF4dVhIUmNkSDBwTzF4dVhIUjlPMXh1WEc1Y2RHTnZibk4wSUdGMGRHRmphRUZ1WTJodmNreHBjM1JsYm1WeUlEMGdLQ1JoYm1Ob2IzSXNJR3hsZEhSbGNpa2dQVDRnZTF4dVhIUmNkQ1JoYm1Ob2IzSXVZV1JrUlhabGJuUk1hWE4wWlc1bGNpZ25ZMnhwWTJzbkxDQW9LU0E5UGlCN1hHNWNkRngwWEhSamIyNXpkQ0JzWlhSMFpYSk9iMlJsSUQwZ1pHOWpkVzFsYm5RdVoyVjBSV3hsYldWdWRFSjVTV1FvYkdWMGRHVnlLVHRjYmx4MFhIUmNkR3hsZENCMFlYSm5aWFE3WEc1Y2JseDBYSFJjZEdsbUlDZ2hjMjl5ZEV0bGVTa2dlMXh1WEhSY2RGeDBYSFIwWVhKblpYUWdQU0JzWlhSMFpYSWdQVDA5SUNkaEp5QS9JR1J2WTNWdFpXNTBMbWRsZEVWc1pXMWxiblJDZVVsa0tDZGhibU5vYjNJdGRHRnlaMlYwSnlrZ09pQnNaWFIwWlhKT2IyUmxMbkJoY21WdWRFVnNaVzFsYm5RdWNHRnlaVzUwUld4bGJXVnVkQzV3WVhKbGJuUkZiR1Z0Wlc1MExuQmhjbVZ1ZEVWc1pXMWxiblF1Y0hKbGRtbHZkWE5GYkdWdFpXNTBVMmxpYkdsdVp5NXhkV1Z5ZVZObGJHVmpkRzl5S0NjdWFuTXRZWEowYVdOc1pTMWhibU5vYjNJdGRHRnlaMlYwSnlrN1hHNWNkRngwWEhSOUlHVnNjMlVnZTF4dVhIUmNkRngwWEhSMFlYSm5aWFFnUFNCc1pYUjBaWElnUFQwOUlDZGhKeUEvSUdSdlkzVnRaVzUwTG1kbGRFVnNaVzFsYm5SQ2VVbGtLQ2RoYm1Ob2IzSXRkR0Z5WjJWMEp5a2dPaUJzWlhSMFpYSk9iMlJsTG5CaGNtVnVkRVZzWlcxbGJuUXVjR0Z5Wlc1MFJXeGxiV1Z1ZEM1d1lYSmxiblJGYkdWdFpXNTBMbkJ5WlhacGIzVnpSV3hsYldWdWRGTnBZbXhwYm1jdWNYVmxjbmxUWld4bFkzUnZjaWduTG1wekxXRnlkR2xqYkdVdFlXNWphRzl5TFhSaGNtZGxkQ2NwTzF4dVhIUmNkRngwZlR0Y2JseHVYSFJjZEZ4MGRHRnlaMlYwTG5OamNtOXNiRWx1ZEc5V2FXVjNLSHRpWldoaGRtbHZjam9nWENKemJXOXZkR2hjSWl3Z1lteHZZMnM2SUZ3aWMzUmhjblJjSW4wcE8xeHVYSFJjZEgwcE8xeHVYSFI5TzF4dVhHNWNkR3hsZENCaFkzUnBkbVZGYm5SeWFXVnpJRDBnZTMwN1hHNWNkR3hsZENBa2IzVjBaWElnUFNCa2IyTjFiV1Z1ZEM1eGRXVnllVk5sYkdWamRHOXlLQ2N1WVd4d2FHRmlaWFJmWDJ4bGRIUmxjbk1uS1R0Y2JseDBKRzkxZEdWeUxtbHVibVZ5U0ZSTlRDQTlJQ2NuTzF4dVhHNWNkR0ZzY0doaFltVjBMbVp2Y2tWaFkyZ29iR1YwZEdWeUlEMCtJSHRjYmx4MFhIUnNaWFFnSkdacGNuTjBSVzUwY25rZ1BTQm1hVzVrUm1seWMzUkZiblJ5ZVNoc1pYUjBaWElwTzF4dVhIUmNkR3hsZENBa1lXNWphRzl5SUQwZ1pHOWpkVzFsYm5RdVkzSmxZWFJsUld4bGJXVnVkQ2duWVNjcE8xeHVYRzVjZEZ4MGFXWWdLQ0VrWm1seWMzUkZiblJ5ZVNrZ2NtVjBkWEp1TzF4dVhHNWNkRngwSkdacGNuTjBSVzUwY25rdWFXUWdQU0JzWlhSMFpYSTdYRzVjZEZ4MEpHRnVZMmh2Y2k1cGJtNWxja2hVVFV3Z1BTQnNaWFIwWlhJdWRHOVZjSEJsY2tOaGMyVW9LVHRjYmx4MFhIUWtZVzVqYUc5eUxtTnNZWE56VG1GdFpTQTlJQ2RoYkhCb1lXSmxkRjlmYkdWMGRHVnlMV0Z1WTJodmNpYzdYRzVjYmx4MFhIUmhkSFJoWTJoQmJtTm9iM0pNYVhOMFpXNWxjaWdrWVc1amFHOXlMQ0JzWlhSMFpYSXBPMXh1WEhSY2RDUnZkWFJsY2k1aGNIQmxibVJEYUdsc1pDZ2tZVzVqYUc5eUtUdGNibHgwZlNrN1hHNTlPMXh1WEc1bGVIQnZjblFnWkdWbVlYVnNkQ0J0WVd0bFFXeHdhR0ZpWlhRN0lpd2lZMjl1YzNRZ2JXRnJaVk5zYVdSbGNpQTlJQ2drYzJ4cFpHVnlLU0E5UGlCN1hHNWNkR052Ym5OMElDUmhjbkp2ZDA1bGVIUWdQU0FrYzJ4cFpHVnlMbkJoY21WdWRFVnNaVzFsYm5RdWNYVmxjbmxUWld4bFkzUnZjaWduTG1GeWNtOTNMVzVsZUhRbktUdGNibHgwWTI5dWMzUWdKR0Z5Y205M1VISmxkaUE5SUNSemJHbGtaWEl1Y0dGeVpXNTBSV3hsYldWdWRDNXhkV1Z5ZVZObGJHVmpkRzl5S0NjdVlYSnliM2N0Y0hKbGRpY3BPMXh1WEc1Y2RHeGxkQ0JqZFhKeVpXNTBJRDBnSkhOc2FXUmxjaTVtYVhKemRFVnNaVzFsYm5SRGFHbHNaRHRjYmx4MEpHRnljbTkzVG1WNGRDNWhaR1JGZG1WdWRFeHBjM1JsYm1WeUtDZGpiR2xqYXljc0lDZ3BJRDArSUh0Y2JseDBYSFJqYjI1emRDQnVaWGgwSUQwZ1kzVnljbVZ1ZEM1dVpYaDBSV3hsYldWdWRGTnBZbXhwYm1jN1hHNWNkRngwYVdZZ0tHNWxlSFFwSUh0Y2JseDBYSFJjZEc1bGVIUXVjMk55YjJ4c1NXNTBiMVpwWlhjb2UySmxhR0YyYVc5eU9pQmNJbk50YjI5MGFGd2lMQ0JpYkc5amF6b2dYQ0p1WldGeVpYTjBYQ0lzSUdsdWJHbHVaVG9nWENKalpXNTBaWEpjSW4wcE8xeHVYSFJjZEZ4MFkzVnljbVZ1ZENBOUlHNWxlSFE3WEc1Y2RGeDBmVnh1WEhSOUtUdGNibHh1WEhRa1lYSnliM2RRY21WMkxtRmtaRVYyWlc1MFRHbHpkR1Z1WlhJb0oyTnNhV05ySnl3Z0tDa2dQVDRnZTF4dVhIUmNkR052Ym5OMElIQnlaWFlnUFNCamRYSnlaVzUwTG5CeVpYWnBiM1Z6Uld4bGJXVnVkRk5wWW14cGJtYzdYRzVjZEZ4MGFXWWdLSEJ5WlhZcElIdGNibHgwWEhSY2RIQnlaWFl1YzJOeWIyeHNTVzUwYjFacFpYY29lMkpsYUdGMmFXOXlPaUJjSW5OdGIyOTBhRndpTENCaWJHOWphem9nWENKdVpXRnlaWE4wWENJc0lHbHViR2x1WlRvZ1hDSmpaVzUwWlhKY0luMHBPMXh1WEhSY2RGeDBZM1Z5Y21WdWRDQTlJSEJ5WlhZN1hHNWNkRngwZlZ4dVhIUjlLVnh1ZlR0Y2JseHVaWGh3YjNKMElHUmxabUYxYkhRZ2JXRnJaVk5zYVdSbGNqc2lMQ0pqYjI1emRDQnBiV0ZuWlZSbGJYQnNZWFJsSUQwZ0tHbHRZV2RsS1NBOVBpQmdYRzQ4WkdsMklHTnNZWE56UFZ3aVlYSjBhV05zWlMxcGJXRm5aVjlmYjNWMFpYSmNJajVjYmx4MFBHbHRaeUJqYkdGemN6MWNJbUZ5ZEdsamJHVXRhVzFoWjJWY0lpQnpjbU05WENJdUxpOHVMaTloYzNObGRITXZhVzFoWjJWekx5UjdhVzFoWjJWOVhDSStQQzlwYldjK1hHNDhMMlJwZGo1Y2JtQTdYRzVjYm1OdmJuTjBJR0Z5ZEdsamJHVlVaVzF3YkdGMFpTQTlJQ2hsYm5SeWVTd2dhU2tnUFQ0Z2UxeHVYSFJqYjI1emRDQjdJSFJwZEd4bExDQm1hWEp6ZEU1aGJXVXNJR3hoYzNST1lXMWxMQ0JwYldGblpYTXNJR1JsYzJOeWFYQjBhVzl1TENCamIyNTBaVzUwY3l3Z1pHbHRaVzV6YVc5dWN5d2dlV1ZoY2l3Z2FYTmliaXdnYjJOc1l5d2diR2x1YXlCOUlEMGdaVzUwY25rN1hHNWNibHgwWTI5dWMzUWdhVzFoWjJWSVZFMU1JRDBnYVcxaFoyVnpMbXhsYm1kMGFDQS9JRnh1WEhSY2RHbHRZV2RsY3k1dFlYQW9hVzFoWjJVZ1BUNGdhVzFoWjJWVVpXMXdiR0YwWlNocGJXRm5aU2twTG1wdmFXNG9KeWNwSURvZ0p5YzdYRzVjYmx4MGNtVjBkWEp1SUNCZ1hHNWNkRngwUEdGeWRHbGpiR1VnWTJ4aGMzTTlYQ0poY25ScFkyeGxYMTl2ZFhSbGNsd2lQbHh1WEhSY2RGeDBQR1JwZGlCamJHRnpjejFjSW1GeWRHbGpiR1ZmWDJsdWJtVnlYQ0krWEc1Y2RGeDBYSFJjZER4a2FYWWdZMnhoYzNNOVhDSmhjblJwWTJ4bFgxOW9aV0ZrYVc1blhDSStYRzVjZEZ4MFhIUmNkRngwUEdFZ1kyeGhjM005WENKcWN5MWxiblJ5ZVMxMGFYUnNaVndpUGp3dllUNWNibHgwWEhSY2RGeDBYSFE4YURJZ1kyeGhjM005WENKaGNuUnBZMnhsTFdobFlXUnBibWRmWDNScGRHeGxYQ0krSkh0MGFYUnNaWDA4TDJneVBseHVYSFJjZEZ4MFhIUmNkRHhrYVhZZ1kyeGhjM005WENKaGNuUnBZMnhsTFdobFlXUnBibWRmWDI1aGJXVmNJajVjYmx4MFhIUmNkRngwWEhSY2REeHpjR0Z1SUdOc1lYTnpQVndpWVhKMGFXTnNaUzFvWldGa2FXNW5YMTl1WVcxbExTMW1hWEp6ZEZ3aVBpUjdabWx5YzNST1lXMWxmVHd2YzNCaGJqNWNibHgwWEhSY2RGeDBYSFJjZER4aElHTnNZWE56UFZ3aWFuTXRaVzUwY25rdFlYSjBhWE4wWENJK1BDOWhQbHh1WEhSY2RGeDBYSFJjZEZ4MFBITndZVzRnWTJ4aGMzTTlYQ0poY25ScFkyeGxMV2hsWVdScGJtZGZYMjVoYldVdExXeGhjM1JjSWo0a2UyeGhjM1JPWVcxbGZUd3ZjM0JoYmo1Y2JseDBYSFJjZEZ4MFhIUThMMlJwZGo1Y2JseDBYSFJjZEZ4MFBDOWthWFkrWEhSY2JseDBYSFJjZEZ4MFBHUnBkaUJqYkdGemN6MWNJbUZ5ZEdsamJHVmZYM05zYVdSbGNpMXZkWFJsY2x3aVBseHVYSFJjZEZ4MFhIUmNkRHhrYVhZZ1kyeGhjM005WENKaGNuUnBZMnhsWDE5emJHbGtaWEl0YVc1dVpYSmNJaUJwWkQxY0luTnNhV1JsY2kwa2UybDlYQ0krWEc1Y2RGeDBYSFJjZEZ4MFhIUWtlMmx0WVdkbFNGUk5USDFjYmx4MFhIUmNkRngwWEhSY2REeGthWFlnWTJ4aGMzTTlYQ0poY25ScFkyeGxMV1JsYzJOeWFYQjBhVzl1WDE5dmRYUmxjbHdpUGx4dVhIUmNkRngwWEhSY2RGeDBYSFE4WkdsMklHTnNZWE56UFZ3aVlYSjBhV05zWlMxa1pYTmpjbWx3ZEdsdmJsd2lQaVI3WkdWelkzSnBjSFJwYjI1OVBDOWthWFkrWEc1Y2RGeDBYSFJjZEZ4MFhIUmNkRHhrYVhZZ1kyeGhjM005WENKaGNuUnBZMnhsTFdSbGRHRnBiRndpUGlSN1kyOXVkR1Z1ZEhOOVBDOWthWFkrWEc1Y2RGeDBYSFJjZEZ4MFhIUmNkRHhrYVhZZ1kyeGhjM005WENKaGNuUnBZMnhsTFdSbGRHRnBiQ0JoY25ScFkyeGxMV1JsZEdGcGJDMHRiV0Z5WjJsdVhDSStKSHRrYVcxbGJuTnBiMjV6ZlR3dlpHbDJQbHh1WEhSY2RGeDBYSFJjZEZ4MFhIUThaR2wySUdOc1lYTnpQVndpWVhKMGFXTnNaUzFrWlhSaGFXd2dZWEowYVdOc1pTMWtaWFJoYVd3dExXMWhjbWRwYmx3aVBpUjdlV1ZoY24wOEwyUnBkajVjYmx4MFhIUmNkRngwWEhSY2RGeDBQR1JwZGlCamJHRnpjejFjSW1GeWRHbGpiR1V0WkdWMFlXbHNJR0Z5ZEdsamJHVXRaR1YwWVdsc0xTMXRZWEpuYVc1Y0lqNGtlMmx6WW01OVBDOWthWFkrWEc1Y2RGeDBYSFJjZEZ4MFhIUmNkRHhrYVhZZ1kyeGhjM005WENKaGNuUnBZMnhsTFdSbGRHRnBiRndpUGs5RFRFTWdQR0VnWTJ4aGMzTTlYQ0poY25ScFkyeGxMV1JsZEdGcGJDMHRiR2x1YTF3aUlIUmhjbWRsZEQxY0lsOWliR0Z1YTF3aUlHaHlaV1k5WENJa2UyeHBibXQ5WENJK0pIdHZZMnhqZlR3dllUNDhMMlJwZGo1Y2JseDBYSFJjZEZ4MFhIUmNkRHd2WkdsMlBseHVYSFJjZEZ4MFhIUmNkRHd2WkdsMlBseHVYSFJjZEZ4MFhIUmNkRHhrYVhZZ1kyeGhjM005WENKaGNuUnBZMnhsWDE5elkzSnZiR3d0WTI5dWRISnZiSE5jSWo1Y2JseDBYSFJjZEZ4MFhIUmNkRHh6Y0dGdUlHTnNZWE56UFZ3aVkyOXVkSEp2YkhNZ1lYSnliM2N0Y0hKbGRsd2lQdUtHa0R3dmMzQmhiajRnWEc1Y2RGeDBYSFJjZEZ4MFhIUThjM0JoYmlCamJHRnpjejFjSW1OdmJuUnliMnh6SUdGeWNtOTNMVzVsZUhSY0lqN2locEk4TDNOd1lXNCtYRzVjZEZ4MFhIUmNkRngwUEM5a2FYWStYRzVjZEZ4MFhIUmNkRngwUEhBZ1kyeGhjM005WENKcWN5MWhjblJwWTJ4bExXRnVZMmh2Y2kxMFlYSm5aWFJjSWo0OEwzQStYRzVjZEZ4MFhIUThMMlJwZGo1Y2JseDBYSFE4TDJGeWRHbGpiR1UrWEc1Y2RHQmNibjA3WEc1Y2JtVjRjRzl5ZENCa1pXWmhkV3gwSUdGeWRHbGpiR1ZVWlcxd2JHRjBaVHNpTENKcGJYQnZjblFnWVhKMGFXTnNaVlJsYlhCc1lYUmxJR1p5YjIwZ0p5NHZZWEowYVdOc1pTYzdYRzVwYlhCdmNuUWdjbVZ1WkdWeVRtRjJUR2NnWm5KdmJTQW5MaTl1WVhaTVp5YzdYRzVjYm1WNGNHOXlkQ0I3SUdGeWRHbGpiR1ZVWlcxd2JHRjBaU3dnY21WdVpHVnlUbUYyVEdjZ2ZUc2lMQ0pqYjI1emRDQjBaVzF3YkdGMFpTQTlJRnh1WEhSZ1BHUnBkaUJqYkdGemN6MWNJbTVoZGw5ZmFXNXVaWEpjSWo1Y2JseDBYSFE4WkdsMklHTnNZWE56UFZ3aWJtRjJYMTl6YjNKMExXSjVYQ0krWEc1Y2RGeDBYSFE4YzNCaGJpQmpiR0Z6Y3oxY0luTnZjblF0WW5sZlgzUnBkR3hsWENJK1UyOXlkQ0JpZVR3dmMzQmhiajVjYmx4MFhIUmNkRHhpZFhSMGIyNGdZMnhoYzNNOVhDSnpiM0owTFdKNUlITnZjblF0WW5sZlgySjVMV0Z5ZEdsemRDQmhZM1JwZG1WY0lpQnBaRDFjSW1wekxXSjVMV0Z5ZEdsemRGd2lQa0Z5ZEdsemREd3ZZblYwZEc5dVBseHVYSFJjZEZ4MFBITndZVzRnWTJ4aGMzTTlYQ0p6YjNKMExXSjVYMTlrYVhacFpHVnlYQ0krSUh3Z1BDOXpjR0Z1UGx4dVhIUmNkRngwUEdKMWRIUnZiaUJqYkdGemN6MWNJbk52Y25RdFlua2djMjl5ZEMxaWVWOWZZbmt0ZEdsMGJHVmNJaUJwWkQxY0ltcHpMV0o1TFhScGRHeGxYQ0krVkdsMGJHVThMMkoxZEhSdmJqNWNibHgwWEhSY2REeHpjR0Z1SUdOc1lYTnpQVndpWm1sdVpGd2lJR2xrUFZ3aWFuTXRabWx1WkZ3aVBseHVYSFJjZEZ4MFhIUW9QSE53WVc0Z1kyeGhjM005WENKbWFXNWtMUzFwYm01bGNsd2lQaVlqT0RrNE5EdEdQQzl6Y0dGdVBpbGNibHgwWEhSY2REd3ZjM0JoYmo1Y2JseDBYSFE4TDJScGRqNWNibHgwWEhROFpHbDJJR05zWVhOelBWd2libUYyWDE5aGJIQm9ZV0psZEZ3aVBseHVYSFJjZEZ4MFBITndZVzRnWTJ4aGMzTTlYQ0poYkhCb1lXSmxkRjlmZEdsMGJHVmNJajVIYnlCMGJ6d3ZjM0JoYmo1Y2JseDBYSFJjZER4a2FYWWdZMnhoYzNNOVhDSmhiSEJvWVdKbGRGOWZiR1YwZEdWeWMxd2lQand2WkdsMlBseHVYSFJjZER3dlpHbDJQbHh1WEhROEwyUnBkajVnTzF4dVhHNWpiMjV6ZENCeVpXNWtaWEpPWVhaTVp5QTlJQ2dwSUQwK0lIdGNibHgwYkdWMElHNWhkazkxZEdWeUlEMGdaRzlqZFcxbGJuUXVaMlYwUld4bGJXVnVkRUo1U1dRb0oycHpMVzVoZGljcE8xeHVYSFJ1WVhaUGRYUmxjaTVwYm01bGNraFVUVXdnUFNCMFpXMXdiR0YwWlR0Y2JuMDdYRzVjYm1WNGNHOXlkQ0JrWldaaGRXeDBJSEpsYm1SbGNrNWhka3huT3lJc0ltbHRjRzl5ZENCN0lDUnNiMkZrYVc1bkxDQWtibUYyTENBa2NHRnlZV3hzWVhnc0lDUmpiMjUwWlc1MExDQWtkR2wwYkdVc0lDUmhjbkp2ZHl3Z0pHMXZaR0ZzTENBa2JHbG5hSFJpYjNnc0lDUjJhV1YzSUgwZ1puSnZiU0FuTGk0dlkyOXVjM1JoYm5Sekp6dGNibHh1WTI5dWMzUWdaR1ZpYjNWdVkyVWdQU0FvWm00c0lIUnBiV1VwSUQwK0lIdGNiaUFnYkdWMElIUnBiV1Z2ZFhRN1hHNWNiaUFnY21WMGRYSnVJR1oxYm1OMGFXOXVLQ2tnZTF4dUlDQWdJR052Ym5OMElHWjFibU4wYVc5dVEyRnNiQ0E5SUNncElEMCtJR1p1TG1Gd2NHeDVLSFJvYVhNc0lHRnlaM1Z0Wlc1MGN5azdYRzRnSUNBZ1hHNGdJQ0FnWTJ4bFlYSlVhVzFsYjNWMEtIUnBiV1Z2ZFhRcE8xeHVJQ0FnSUhScGJXVnZkWFFnUFNCelpYUlVhVzFsYjNWMEtHWjFibU4wYVc5dVEyRnNiQ3dnZEdsdFpTazdYRzRnSUgxY2JuMDdYRzVjYm1OdmJuTjBJR2hwWkdWTWIyRmthVzVuSUQwZ0tDa2dQVDRnZTF4dVhIUWtiRzloWkdsdVp5NW1iM0pGWVdOb0tHVnNaVzBnUFQ0Z1pXeGxiUzVqYkdGemMweHBjM1F1WVdSa0tDZHlaV0ZrZVNjcEtUdGNibHgwSkc1aGRpNWpiR0Z6YzB4cGMzUXVZV1JrS0NkeVpXRmtlU2NwTzF4dWZUdGNibHh1WTI5dWMzUWdjMk55YjJ4c1ZHOVViM0FnUFNBb0tTQTlQaUI3WEc1Y2RHeGxkQ0IwYjNBZ1BTQmtiMk4xYldWdWRDNW5aWFJGYkdWdFpXNTBRbmxKWkNnbllXNWphRzl5TFhSaGNtZGxkQ2NwTzF4dVhIUjBiM0F1YzJOeWIyeHNTVzUwYjFacFpYY29lMkpsYUdGMmFXOXlPaUJjSW5OdGIyOTBhRndpTENCaWJHOWphem9nWENKemRHRnlkRndpZlNrN1hHNTlPMXh1WEc1bGVIQnZjblFnZXlCa1pXSnZkVzVqWlN3Z2FHbGtaVXh2WVdScGJtY3NJSE5qY205c2JGUnZWRzl3SUgwN0lsMTkifQ==
