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

var scrollToTop = function scrollToTop() {
	var thing = document.getElementById('anchor-target');
	thing.scrollIntoView({ behavior: "smooth", block: "start" });
};

var prev = void 0;
var current = 0;
var isShowing = false;
var attachArrowListeners = function attachArrowListeners() {
	_constants.$arrow.addEventListener('click', function () {
		scrollToTop();
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

var renderImages = function renderImages(images, $images) {
	images.forEach(function (image) {
		var src = '../../assets/images/' + image;
		var $imgOuter = document.createElement('div');
		var $img = document.createElement('IMG');
		$img.className = 'article-image';
		$img.src = src;
		$imgOuter.appendChild($img);
		$images.appendChild($imgOuter);
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


		$articleList.insertAdjacentHTML('beforeend', _templates.articleTemplate);

		var $allSliders = document.querySelectorAll('.article__slider-inner');
		var $slider = $allSliders[$allSliders.length - 1];
		// const $images = $slider.querySelector('.article__images');

		if (images.length) renderImages(images, $slider);

		var $descriptionOuter = document.createElement('div');
		var $descriptionNode = document.createElement('p');
		var $detailNode = document.createElement('p');
		$descriptionOuter.classList.add('article-description__outer');
		$descriptionNode.classList.add('article-description');
		$detailNode.classList.add('article-detail');

		$descriptionNode.innerHTML = description;
		$detailNode.innerHTML = detail;

		$descriptionOuter.appendChild($descriptionNode, $detailNode);
		$slider.appendChild($descriptionOuter);

		var $titleNodes = document.querySelectorAll('.article-heading__title');
		var $title = $titleNodes[$titleNodes.length - 1];

		var $firstNodes = document.querySelectorAll('.article-heading__name--first');
		var $first = $firstNodes[$firstNodes.length - 1];

		var $lastNodes = document.querySelectorAll('.article-heading__name--last');
		var $last = $lastNodes[$lastNodes.length - 1];

		$title.innerHTML = title;
		$first.innerHTML = firstName;
		$last.innerHTML = lastName;

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
	entries.byTitle = data.slice(); // copies data for byTitle sort

	sortByTitle();
	renderEntries();
};

var fetchData = function fetchData() {
	fetch(_constants.DB).then(function (res) {
		return res.json();
	}).then(function (data) {
		setData(data);
		(0, _utils.hideLoading)();
	}).catch(function (err) {
		return console.warn(err);
	});
};

var init = function init() {
	_smoothscrollPolyfill2.default.polyfill();
	fetchData();
	(0, _templates.navLg)();
	addSortButtonListeners();
	attachArrowListeners();
	attachModalListeners();
};

init();

},{"./constants":2,"./templates":5,"./utils":7,"smoothscroll-polyfill":1}],4:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
	value: true
});
var articleTemplate = "\n\t<article class=\"article__outer\">\n\t\t<div class=\"article__inner\">\n\t\t\t<div class=\"article__heading\">\n\t\t\t\t<a class=\"js-entry-title\"></a>\n\t\t\t\t<h2 class=\"article-heading__title\"></h2>\n\t\t\t\t<div class=\"article-heading__name\">\n\t\t\t\t\t<span class=\"article-heading__name--first\"></span>\n\t\t\t\t\t<a class=\"js-entry-artist\"></a>\n\t\t\t\t\t<span class=\"article-heading__name--last\"></span>\n\t\t\t\t</div>\n\t\t\t</div>\t\n\t\t\t<div class=\"article__slider-outer\">\n\t\t\t\t<div class=\"article__slider-inner\"></div>\n\t\t\t\t<div class=\"article__scroll-controls\">\n\t\t\t\t\t<span class=\"controls arrow-prev\">\u2190</span> \n\t\t\t\t\t<span class=\"controls arrow-next\">\u2192</span>\n\t\t\t\t</div>\n\t\t\t\t<p class=\"js-article-anchor-target\"></p>\n\t\t</div>\n\t</article>\n";

exports.default = articleTemplate;

},{}],5:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.navLg = exports.articleTemplate = undefined;

var _article = require('./article');

var _article2 = _interopRequireDefault(_article);

var _navLg = require('./navLg');

var _navLg2 = _interopRequireDefault(_navLg);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

exports.articleTemplate = _article2.default;
exports.navLg = _navLg2.default;

},{"./article":4,"./navLg":6}],6:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});
var template = '<div class="nav__inner">\n\t\t<div class="nav__sort-by">\n\t\t\t<span class="sort-by__title">Sort by</span>\n\t\t\t<button class="sort-by sort-by__by-artist active" id="js-by-artist">Artist</button>\n\t\t\t<span class="sort-by__divider"> | </span>\n\t\t\t<button class="sort-by sort-by__by-title" id="js-by-title">Title</button>\n\t\t\t<span class="find" id="js-find">\n\t\t\t\t(<span class="find--inner">&#8984;F</span>)\n\t\t\t</span>\n\t\t</div>\n\t\t<div class="nav__alphabet">\n\t\t\t<span class="alphabet__title">Go to</span>\n\t\t\t<div class="alphabet__letters"></div>\n\t\t</div>\n\t</div>';

var navLg = function navLg() {
	var navOuter = document.getElementById('js-nav');
	navOuter.innerHTML = template;
};

exports.default = navLg;

},{}],7:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.hideLoading = exports.debounce = undefined;

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
    elem.classList.remove('loading');
    elem.classList.add('ready');
  });
  _constants.$nav.classList.add('ready');
};

exports.debounce = debounce;
exports.hideLoading = hideLoading;

},{"../constants":2}]},{},[3])

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvc21vb3Roc2Nyb2xsLXBvbHlmaWxsL2Rpc3Qvc21vb3Roc2Nyb2xsLmpzIiwic3JjL2pzL2NvbnN0YW50cy5qcyIsInNyYy9qcy9pbmRleC5qcyIsInNyYy9qcy90ZW1wbGF0ZXMvYXJ0aWNsZS5qcyIsInNyYy9qcy90ZW1wbGF0ZXMvaW5kZXguanMiLCJzcmMvanMvdGVtcGxhdGVzL25hdkxnLmpzIiwic3JjL2pzL3V0aWxzL2luZGV4LmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7OztBQ3ZiQSxJQUFNLEtBQUssK0ZBQVg7QUFDQSxJQUFNLFdBQVcsQ0FBQyxHQUFELEVBQU0sR0FBTixFQUFXLEdBQVgsRUFBZ0IsR0FBaEIsRUFBcUIsR0FBckIsRUFBMEIsR0FBMUIsRUFBK0IsR0FBL0IsRUFBb0MsR0FBcEMsRUFBeUMsR0FBekMsRUFBOEMsR0FBOUMsRUFBbUQsR0FBbkQsRUFBd0QsR0FBeEQsRUFBNkQsR0FBN0QsRUFBa0Us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Y0FBYyxTQUFkLFdBQWMsR0FBTTtBQUN6QixzQkFBUyxPQUFULENBQWlCLGdCQUFRO0FBQ3hCLFNBQUssU0FBTCxDQUFlLE1BQWYsQ0FBc0IsU0FBdEI7QUFDQSxTQUFLLFNBQUwsQ0FBZSxHQUFmLENBQW1CLE9BQW5CO0FBQ0EsR0FIRDtBQUlBLGtCQUFLLFNBQUwsQ0FBZSxHQUFmLENBQW1CLE9BQW5CO0FBQ0EsQ0FORDs7UUFRUyxRLEdBQUEsUTtRQUFVLFcsR0FBQSxXIiwiZmlsZSI6ImJ1bmRsZS5qcyIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbigpe2Z1bmN0aW9uIHIoZSxuLHQpe2Z1bmN0aW9uIG8oaSxmKXtpZighbltpXSl7aWYoIWVbaV0pe3ZhciBjPVwiZnVuY3Rpb25cIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmU7aWYoIWYmJmMpcmV0dXJuIGMoaSwhMCk7aWYodSlyZXR1cm4gdShpLCEwKTt2YXIgYT1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK2krXCInXCIpO3Rocm93IGEuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixhfXZhciBwPW5baV09e2V4cG9ydHM6e319O2VbaV1bMF0uY2FsbChwLmV4cG9ydHMsZnVuY3Rpb24ocil7dmFyIG49ZVtpXVsxXVtyXTtyZXR1cm4gbyhufHxyKX0scCxwLmV4cG9ydHMscixlLG4sdCl9cmV0dXJuIG5baV0uZXhwb3J0c31mb3IodmFyIHU9XCJmdW5jdGlvblwiPT10eXBlb2YgcmVxdWlyZSYmcmVxdWlyZSxpPTA7aTx0Lmxlbmd0aDtpKyspbyh0W2ldKTtyZXR1cm4gb31yZXR1cm4gcn0pKCkiLCIvKiBzbW9vdGhzY3JvbGwgdjAuNC4wIC0gMjAxOCAtIER1c3RhbiBLYXN0ZW4sIEplcmVtaWFzIE1lbmljaGVsbGkgLSBNSVQgTGljZW5zZSAqL1xuKGZ1bmN0aW9uICgpIHtcbiAgJ3VzZSBzdHJpY3QnO1xuXG4gIC8vIHBvbHlmaWxsXG4gIGZ1bmN0aW9uIHBvbHlmaWxsKCkge1xuICAgIC8vIGFsaWFzZXNcbiAgICB2YXIgdyA9IHdpbmRvdztcbiAgICB2YXIgZCA9IGRvY3VtZW50O1xuXG4gICAgLy8gcmV0dXJuIGlmIHNjcm9sbCBiZWhhdmlvciBpcyBzdXBwb3J0ZWQgYW5kIHBvbHlmaWxsIGlzIG5vdCBmb3JjZWRcbiAgICBpZiAoXG4gICAgICAnc2Nyb2xsQmVoYXZpb3InIGluIGQuZG9jdW1lbnRFbGVtZW50LnN0eWxlICYmXG4gICAgICB3Ll9fZm9yY2VTbW9vdGhTY3JvbGxQb2x5ZmlsbF9fICE9PSB0cnVlXG4gICAgKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgLy8gZ2xvYmFsc1xuICAgIHZhciBFbGVtZW50ID0gdy5IVE1MRWxlbWVudCB8fCB3LkVsZW1lbnQ7XG4gICAgdmFyIFNDUk9MTF9USU1FID0gNDY4O1xuXG4gICAgLy8gb2JqZWN0IGdhdGhlcmluZyBvcmlnaW5hbCBzY3JvbGwgbWV0aG9kc1xuICAgIHZhciBvcmlnaW5hbCA9IHtcbiAgICAgIHNjcm9sbDogdy5zY3JvbGwgfHwgdy5zY3JvbGxUbyxcbiAgICAgIHNjcm9sbEJ5OiB3LnNjcm9sbEJ5LFxuICAgICAgZWxlbWVudFNjcm9sbDogRWxlbWVudC5wcm90b3R5cGUuc2Nyb2xsIHx8IHNjcm9sbEVsZW1lbnQsXG4gICAgICBzY3JvbGxJbnRvVmlldzogRWxlbWVudC5wcm90b3R5cGUuc2Nyb2xsSW50b1ZpZXdcbiAgICB9O1xuXG4gICAgLy8gZGVmaW5lIHRpbWluZyBtZXRob2RcbiAgICB2YXIgbm93ID1cbiAgICAgIHcucGVyZm9ybWFuY2UgJiYgdy5wZXJmb3JtYW5jZS5ub3dcbiAgICAgICAgPyB3LnBlcmZvcm1hbmNlLm5vdy5iaW5kKHcucGVyZm9ybWFuY2UpXG4gICAgICAgIDogRGF0ZS5ub3c7XG5cbiAgICAvKipcbiAgICAgKiBpbmRpY2F0ZXMgaWYgYSB0aGUgY3VycmVudCBicm93c2VyIGlzIG1hZGUgYnkgTWljcm9zb2Z0XG4gICAgICogQG1ldGhvZCBpc01pY3Jvc29mdEJyb3dzZXJcbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gdXNlckFnZW50XG4gICAgICogQHJldHVybnMge0Jvb2xlYW59XG4gICAgICovXG4gICAgZnVuY3Rpb24gaXNNaWNyb3NvZnRCcm93c2VyKHVzZXJBZ2VudCkge1xuICAgICAgdmFyIHVzZXJBZ2VudFBhdHRlcm5zID0gWydNU0lFICcsICdUcmlkZW50LycsICdFZGdlLyddO1xuXG4gICAgICByZXR1cm4gbmV3IFJlZ0V4cCh1c2VyQWdlbnRQYXR0ZXJucy5qb2luKCd8JykpLnRlc3QodXNlckFnZW50KTtcbiAgICB9XG5cbiAgICAvKlxuICAgICAqIElFIGhhcyByb3VuZGluZyBidWcgcm91bmRpbmcgZG93biBjbGllbnRIZWlnaHQgYW5kIGNsaWVudFdpZHRoIGFuZFxuICAgICAqIHJvdW5kaW5nIHVwIHNjcm9sbEhlaWdodCBhbmQgc2Nyb2xsV2lkdGggY2F1c2luZyBmYWxzZSBwb3NpdGl2ZXNcbiAgICAgKiBvbiBoYXNTY3JvbGxhYmxlU3BhY2VcbiAgICAgKi9cbiAgICB2YXIgUk9VTkRJTkdfVE9MRVJBTkNFID0gaXNNaWNyb3NvZnRCcm93c2VyKHcubmF2aWdhdG9yLnVzZXJBZ2VudCkgPyAxIDogMDtcblxuICAgIC8qKlxuICAgICAqIGNoYW5nZXMgc2Nyb2xsIHBvc2l0aW9uIGluc2lkZSBhbiBlbGVtZW50XG4gICAgICogQG1ldGhvZCBzY3JvbGxFbGVtZW50XG4gICAgICogQHBhcmFtIHtOdW1iZXJ9IHhcbiAgICAgKiBAcGFyYW0ge051bWJlcn0geVxuICAgICAqIEByZXR1cm5zIHt1bmRlZmluZWR9XG4gICAgICovXG4gICAgZnVuY3Rpb24gc2Nyb2xsRWxlbWVudCh4LCB5KSB7XG4gICAgICB0aGlzLnNjcm9sbExlZnQgPSB4O1xuICAgICAgdGhpcy5zY3JvbGxUb3AgPSB5O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIHJldHVybnMgcmVzdWx0IG9mIGFwcGx5aW5nIGVhc2UgbWF0aCBmdW5jdGlvbiB0byBhIG51bWJlclxuICAgICAqIEBtZXRob2QgZWFzZVxuICAgICAqIEBwYXJhbSB7TnVtYmVyfSBrXG4gICAgICogQHJldHVybnMge051bWJlcn1cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBlYXNlKGspIHtcbiAgICAgIHJldHVybiAwLjUgKiAoMSAtIE1hdGguY29zKE1hdGguUEkgKiBrKSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogaW5kaWNhdGVzIGlmIGEgc21vb3RoIGJlaGF2aW9yIHNob3VsZCBiZSBhcHBsaWVkXG4gICAgICogQG1ldGhvZCBzaG91bGRCYWlsT3V0XG4gICAgICogQHBhcmFtIHtOdW1iZXJ8T2JqZWN0fSBmaXJzdEFyZ1xuICAgICAqIEByZXR1cm5zIHtCb29sZWFufVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIHNob3VsZEJhaWxPdXQoZmlyc3RBcmcpIHtcbiAgICAgIGlmIChcbiAgICAgICAgZmlyc3RBcmcgPT09IG51bGwgfHxcbiAgICAgICAgdHlwZW9mIGZpcnN0QXJnICE9PSAnb2JqZWN0JyB8fFxuICAgICAgICBmaXJzdEFyZy5iZWhhdmlvciA9PT0gdW5kZWZpbmVkIHx8XG4gICAgICAgIGZpcnN0QXJnLmJlaGF2aW9yID09PSAnYXV0bycgfHxcbiAgICAgICAgZmlyc3RBcmcuYmVoYXZpb3IgPT09ICdpbnN0YW50J1xuICAgICAgKSB7XG4gICAgICAgIC8vIGZpcnN0IGFyZ3VtZW50IGlzIG5vdCBhbiBvYmplY3QvbnVsbFxuICAgICAgICAvLyBvciBiZWhhdmlvciBpcyBhdXRvLCBpbnN0YW50IG9yIHVuZGVmaW5lZFxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH1cblxuICAgICAgaWYgKHR5cGVvZiBmaXJzdEFyZyA9PT0gJ29iamVjdCcgJiYgZmlyc3RBcmcuYmVoYXZpb3IgPT09ICdzbW9vdGgnKSB7XG4gICAgICAgIC8vIGZpcnN0IGFyZ3VtZW50IGlzIGFuIG9iamVjdCBhbmQgYmVoYXZpb3IgaXMgc21vb3RoXG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cblxuICAgICAgLy8gdGhyb3cgZXJyb3Igd2hlbiBiZWhhdmlvciBpcyBub3Qgc3VwcG9ydGVkXG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFxuICAgICAgICAnYmVoYXZpb3IgbWVtYmVyIG9mIFNjcm9sbE9wdGlvbnMgJyArXG4gICAgICAgICAgZmlyc3RBcmcuYmVoYXZpb3IgK1xuICAgICAgICAgICcgaXMgbm90IGEgdmFsaWQgdmFsdWUgZm9yIGVudW1lcmF0aW9uIFNjcm9sbEJlaGF2aW9yLidcbiAgICAgICk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogaW5kaWNhdGVzIGlmIGFuIGVsZW1lbnQgaGFzIHNjcm9sbGFibGUgc3BhY2UgaW4gdGhlIHByb3ZpZGVkIGF4aXNcbiAgICAgKiBAbWV0aG9kIGhhc1Njcm9sbGFibGVTcGFjZVxuICAgICAqIEBwYXJhbSB7Tm9kZX0gZWxcbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gYXhpc1xuICAgICAqIEByZXR1cm5zIHtCb29sZWFufVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGhhc1Njcm9sbGFibGVTcGFjZShlbCwgYXhpcykge1xuICAgICAgaWYgKGF4aXMgPT09ICdZJykge1xuICAgICAgICByZXR1cm4gZWwuY2xpZW50SGVpZ2h0ICsgUk9VTkRJTkdfVE9MRVJBTkNFIDwgZWwuc2Nyb2xsSGVpZ2h0O1xuICAgICAgfVxuXG4gICAgICBpZiAoYXhpcyA9PT0gJ1gnKSB7XG4gICAgICAgIHJldHVybiBlbC5jbGllbnRXaWR0aCArIFJPVU5ESU5HX1RPTEVSQU5DRSA8IGVsLnNjcm9sbFdpZHRoO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIGluZGljYXRlcyBpZiBhbiBlbGVtZW50IGhhcyBhIHNjcm9sbGFibGUgb3ZlcmZsb3cgcHJvcGVydHkgaW4gdGhlIGF4aXNcbiAgICAgKiBAbWV0aG9kIGNhbk92ZXJmbG93XG4gICAgICogQHBhcmFtIHtOb2RlfSBlbFxuICAgICAqIEBwYXJhbSB7U3RyaW5nfSBheGlzXG4gICAgICogQHJldHVybnMge0Jvb2xlYW59XG4gICAgICovXG4gICAgZnVuY3Rpb24gY2FuT3ZlcmZsb3coZWwsIGF4aXMpIHtcbiAgICAgIHZhciBvdmVyZmxvd1ZhbHVlID0gdy5nZXRDb21wdXRlZFN0eWxlKGVsLCBudWxsKVsnb3ZlcmZsb3cnICsgYXhpc107XG5cbiAgICAgIHJldHVybiBvdmVyZmxvd1ZhbHVlID09PSAnYXV0bycgfHwgb3ZlcmZsb3dWYWx1ZSA9PT0gJ3Njcm9sbCc7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogaW5kaWNhdGVzIGlmIGFuIGVsZW1lbnQgY2FuIGJlIHNjcm9sbGVkIGluIGVpdGhlciBheGlzXG4gICAgICogQG1ldGhvZCBpc1Njcm9sbGFibGVcbiAgICAgKiBAcGFyYW0ge05vZGV9IGVsXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IGF4aXNcbiAgICAgKiBAcmV0dXJucyB7Qm9vbGVhbn1cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBpc1Njcm9sbGFibGUoZWwpIHtcbiAgICAgIHZhciBpc1Njcm9sbGFibGVZID0gaGFzU2Nyb2xsYWJsZVNwYWNlKGVsLCAnWScpICYmIGNhbk92ZXJmbG93KGVsLCAnWScpO1xuICAgICAgdmFyIGlzU2Nyb2xsYWJsZVggPSBoYXNTY3JvbGxhYmxlU3BhY2UoZWwsICdYJykgJiYgY2FuT3ZlcmZsb3coZWwsICdYJyk7XG5cbiAgICAgIHJldHVybiBpc1Njcm9sbGFibGVZIHx8IGlzU2Nyb2xsYWJsZVg7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogZmluZHMgc2Nyb2xsYWJsZSBwYXJlbnQgb2YgYW4gZWxlbWVudFxuICAgICAqIEBtZXRob2QgZmluZFNjcm9sbGFibGVQYXJlbnRcbiAgICAgKiBAcGFyYW0ge05vZGV9IGVsXG4gICAgICogQHJldHVybnMge05vZGV9IGVsXG4gICAgICovXG4gICAgZnVuY3Rpb24gZmluZFNjcm9sbGFibGVQYXJlbnQoZWwpIHtcbiAgICAgIHZhciBpc0JvZHk7XG5cbiAgICAgIGRvIHtcbiAgICAgICAgZWwgPSBlbC5wYXJlbnROb2RlO1xuXG4gICAgICAgIGlzQm9keSA9IGVsID09PSBkLmJvZHk7XG4gICAgICB9IHdoaWxlIChpc0JvZHkgPT09IGZhbHNlICYmIGlzU2Nyb2xsYWJsZShlbCkgPT09IGZhbHNlKTtcblxuICAgICAgaXNCb2R5ID0gbnVsbDtcblxuICAgICAgcmV0dXJuIGVsO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIHNlbGYgaW52b2tlZCBmdW5jdGlvbiB0aGF0LCBnaXZlbiBhIGNvbnRleHQsIHN0ZXBzIHRocm91Z2ggc2Nyb2xsaW5nXG4gICAgICogQG1ldGhvZCBzdGVwXG4gICAgICogQHBhcmFtIHtPYmplY3R9IGNvbnRleHRcbiAgICAgKiBAcmV0dXJucyB7dW5kZWZpbmVkfVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIHN0ZXAoY29udGV4dCkge1xuICAgICAgdmFyIHRpbWUgPSBub3coKTtcbiAgICAgIHZhciB2YWx1ZTtcbiAgICAgIHZhciBjdXJyZW50WDtcbiAgICAgIHZhciBjdXJyZW50WTtcbiAgICAgIHZhciBlbGFwc2VkID0gKHRpbWUgLSBjb250ZXh0LnN0YXJ0VGltZSkgLyBTQ1JPTExfVElNRTtcblxuICAgICAgLy8gYXZvaWQgZWxhcHNlZCB0aW1lcyBoaWdoZXIgdGhhbiBvbmVcbiAgICAgIGVsYXBzZWQgPSBlbGFwc2VkID4gMSA/IDEgOiBlbGFwc2VkO1xuXG4gICAgICAvLyBhcHBseSBlYXNpbmcgdG8gZWxhcHNlZCB0aW1lXG4gICAgICB2YWx1ZSA9IGVhc2UoZWxhcHNlZCk7XG5cbiAgICAgIGN1cnJlbnRYID0gY29udGV4dC5zdGFydFggKyAoY29udGV4dC54IC0gY29udGV4dC5zdGFydFgpICogdmFsdWU7XG4gICAgICBjdXJyZW50WSA9IGNvbnRleHQuc3RhcnRZICsgKGNvbnRleHQueSAtIGNvbnRleHQuc3RhcnRZKSAqIHZhbHVlO1xuXG4gICAgICBjb250ZXh0Lm1ldGhvZC5jYWxsKGNvbnRleHQuc2Nyb2xsYWJsZSwgY3VycmVudFgsIGN1cnJlbnRZKTtcblxuICAgICAgLy8gc2Nyb2xsIG1vcmUgaWYgd2UgaGF2ZSBub3QgcmVhY2hlZCBvdXIgZGVzdGluYXRpb25cbiAgICAgIGlmIChjdXJyZW50WCAhPT0gY29udGV4dC54IHx8IGN1cnJlbnRZICE9PSBjb250ZXh0LnkpIHtcbiAgICAgICAgdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUoc3RlcC5iaW5kKHcsIGNvbnRleHQpKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBzY3JvbGxzIHdpbmRvdyBvciBlbGVtZW50IHdpdGggYSBzbW9vdGggYmVoYXZpb3JcbiAgICAgKiBAbWV0aG9kIHNtb290aFNjcm9sbFxuICAgICAqIEBwYXJhbSB7T2JqZWN0fE5vZGV9IGVsXG4gICAgICogQHBhcmFtIHtOdW1iZXJ9IHhcbiAgICAgKiBAcGFyYW0ge051bWJlcn0geVxuICAgICAqIEByZXR1cm5zIHt1bmRlZmluZWR9XG4gICAgICovXG4gICAgZnVuY3Rpb24gc21vb3RoU2Nyb2xsKGVsLCB4LCB5KSB7XG4gICAgICB2YXIgc2Nyb2xsYWJsZTtcbiAgICAgIHZhciBzdGFydFg7XG4gICAgICB2YXIgc3RhcnRZO1xuICAgICAgdmFyIG1ldGhvZDtcbiAgICAgIHZhciBzdGFydFRpbWUgPSBub3coKTtcblxuICAgICAgLy8gZGVmaW5lIHNjcm9sbCBjb250ZXh0XG4gICAgICBpZiAoZWwgPT09IGQuYm9keSkge1xuICAgICAgICBzY3JvbGxhYmxlID0gdztcbiAgICAgICAgc3RhcnRYID0gdy5zY3JvbGxYIHx8IHcucGFnZVhPZmZzZXQ7XG4gICAgICAgIHN0YXJ0WSA9IHcuc2Nyb2xsWSB8fCB3LnBhZ2VZT2Zmc2V0O1xuICAgICAgICBtZXRob2QgPSBvcmlnaW5hbC5zY3JvbGw7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBzY3JvbGxhYmxlID0gZWw7XG4gICAgICAgIHN0YXJ0WCA9IGVsLnNjcm9sbExlZnQ7XG4gICAgICAgIHN0YXJ0WSA9IGVsLnNjcm9sbFRvcDtcbiAgICAgICAgbWV0aG9kID0gc2Nyb2xsRWxlbWVudDtcbiAgICAgIH1cblxuICAgICAgLy8gc2Nyb2xsIGxvb3Bpbmcgb3ZlciBhIGZyYW1lXG4gICAgICBzdGVwKHtcbiAgICAgICAgc2Nyb2xsYWJsZTogc2Nyb2xsYWJsZSxcbiAgICAgICAgbWV0aG9kOiBtZXRob2QsXG4gICAgICAgIHN0YXJ0VGltZTogc3RhcnRUaW1lLFxuICAgICAgICBzdGFydFg6IHN0YXJ0WCxcbiAgICAgICAgc3RhcnRZOiBzdGFydFksXG4gICAgICAgIHg6IHgsXG4gICAgICAgIHk6IHlcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIC8vIE9SSUdJTkFMIE1FVEhPRFMgT1ZFUlJJREVTXG4gICAgLy8gdy5zY3JvbGwgYW5kIHcuc2Nyb2xsVG9cbiAgICB3LnNjcm9sbCA9IHcuc2Nyb2xsVG8gPSBmdW5jdGlvbigpIHtcbiAgICAgIC8vIGF2b2lkIGFjdGlvbiB3aGVuIG5vIGFyZ3VtZW50cyBhcmUgcGFzc2VkXG4gICAgICBpZiAoYXJndW1lbnRzWzBdID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICAvLyBhdm9pZCBzbW9vdGggYmVoYXZpb3IgaWYgbm90IHJlcXVpcmVkXG4gICAgICBpZiAoc2hvdWxkQmFpbE91dChhcmd1bWVudHNbMF0pID09PSB0cnVlKSB7XG4gICAgICAgIG9yaWdpbmFsLnNjcm9sbC5jYWxsKFxuICAgICAgICAgIHcsXG4gICAgICAgICAgYXJndW1lbnRzWzBdLmxlZnQgIT09IHVuZGVmaW5lZFxuICAgICAgICAgICAgPyBhcmd1bWVudHNbMF0ubGVmdFxuICAgICAgICAgICAgOiB0eXBlb2YgYXJndW1lbnRzWzBdICE9PSAnb2JqZWN0J1xuICAgICAgICAgICAgICA/IGFyZ3VtZW50c1swXVxuICAgICAgICAgICAgICA6IHcuc2Nyb2xsWCB8fCB3LnBhZ2VYT2Zmc2V0LFxuICAgICAgICAgIC8vIHVzZSB0b3AgcHJvcCwgc2Vjb25kIGFyZ3VtZW50IGlmIHByZXNlbnQgb3IgZmFsbGJhY2sgdG8gc2Nyb2xsWVxuICAgICAgICAgIGFyZ3VtZW50c1swXS50b3AgIT09IHVuZGVmaW5lZFxuICAgICAgICAgICAgPyBhcmd1bWVudHNbMF0udG9wXG4gICAgICAgICAgICA6IGFyZ3VtZW50c1sxXSAhPT0gdW5kZWZpbmVkXG4gICAgICAgICAgICAgID8gYXJndW1lbnRzWzFdXG4gICAgICAgICAgICAgIDogdy5zY3JvbGxZIHx8IHcucGFnZVlPZmZzZXRcbiAgICAgICAgKTtcblxuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIC8vIExFVCBUSEUgU01PT1RITkVTUyBCRUdJTiFcbiAgICAgIHNtb290aFNjcm9sbC5jYWxsKFxuICAgICAgICB3LFxuICAgICAgICBkLmJvZHksXG4gICAgICAgIGFyZ3VtZW50c1swXS5sZWZ0ICE9PSB1bmRlZmluZWRcbiAgICAgICAgICA/IH5+YXJndW1lbnRzWzBdLmxlZnRcbiAgICAgICAgICA6IHcuc2Nyb2xsWCB8fCB3LnBhZ2VYT2Zmc2V0LFxuICAgICAgICBhcmd1bWVudHNbMF0udG9wICE9PSB1bmRlZmluZWRcbiAgICAgICAgICA/IH5+YXJndW1lbnRzWzBdLnRvcFxuICAgICAgICAgIDogdy5zY3JvbGxZIHx8IHcucGFnZVlPZmZzZXRcbiAgICAgICk7XG4gICAgfTtcblxuICAgIC8vIHcuc2Nyb2xsQnlcbiAgICB3LnNjcm9sbEJ5ID0gZnVuY3Rpb24oKSB7XG4gICAgICAvLyBhdm9pZCBhY3Rpb24gd2hlbiBubyBhcmd1bWVudHMgYXJlIHBhc3NlZFxuICAgICAgaWYgKGFyZ3VtZW50c1swXSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgLy8gYXZvaWQgc21vb3RoIGJlaGF2aW9yIGlmIG5vdCByZXF1aXJlZFxuICAgICAgaWYgKHNob3VsZEJhaWxPdXQoYXJndW1lbnRzWzBdKSkge1xuICAgICAgICBvcmlnaW5hbC5zY3JvbGxCeS5jYWxsKFxuICAgICAgICAgIHcsXG4gICAgICAgICAgYXJndW1lbnRzWzBdLmxlZnQgIT09IHVuZGVmaW5lZFxuICAgICAgICAgICAgPyBhcmd1bWVudHNbMF0ubGVmdFxuICAgICAgICAgICAgOiB0eXBlb2YgYXJndW1lbnRzWzBdICE9PSAnb2JqZWN0JyA/IGFyZ3VtZW50c1swXSA6IDAsXG4gICAgICAgICAgYXJndW1lbnRzWzBdLnRvcCAhPT0gdW5kZWZpbmVkXG4gICAgICAgICAgICA/IGFyZ3VtZW50c1swXS50b3BcbiAgICAgICAgICAgIDogYXJndW1lbnRzWzFdICE9PSB1bmRlZmluZWQgPyBhcmd1bWVudHNbMV0gOiAwXG4gICAgICAgICk7XG5cbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICAvLyBMRVQgVEhFIFNNT09USE5FU1MgQkVHSU4hXG4gICAgICBzbW9vdGhTY3JvbGwuY2FsbChcbiAgICAgICAgdyxcbiAgICAgICAgZC5ib2R5LFxuICAgICAgICB+fmFyZ3VtZW50c1swXS5sZWZ0ICsgKHcuc2Nyb2xsWCB8fCB3LnBhZ2VYT2Zmc2V0KSxcbiAgICAgICAgfn5hcmd1bWVudHNbMF0udG9wICsgKHcuc2Nyb2xsWSB8fCB3LnBhZ2VZT2Zmc2V0KVxuICAgICAgKTtcbiAgICB9O1xuXG4gICAgLy8gRWxlbWVudC5wcm90b3R5cGUuc2Nyb2xsIGFuZCBFbGVtZW50LnByb3RvdHlwZS5zY3JvbGxUb1xuICAgIEVsZW1lbnQucHJvdG90eXBlLnNjcm9sbCA9IEVsZW1lbnQucHJvdG90eXBlLnNjcm9sbFRvID0gZnVuY3Rpb24oKSB7XG4gICAgICAvLyBhdm9pZCBhY3Rpb24gd2hlbiBubyBhcmd1bWVudHMgYXJlIHBhc3NlZFxuICAgICAgaWYgKGFyZ3VtZW50c1swXSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgLy8gYXZvaWQgc21vb3RoIGJlaGF2aW9yIGlmIG5vdCByZXF1aXJlZFxuICAgICAgaWYgKHNob3VsZEJhaWxPdXQoYXJndW1lbnRzWzBdKSA9PT0gdHJ1ZSkge1xuICAgICAgICAvLyBpZiBvbmUgbnVtYmVyIGlzIHBhc3NlZCwgdGhyb3cgZXJyb3IgdG8gbWF0Y2ggRmlyZWZveCBpbXBsZW1lbnRhdGlvblxuICAgICAgICBpZiAodHlwZW9mIGFyZ3VtZW50c1swXSA9PT0gJ251bWJlcicgJiYgYXJndW1lbnRzWzFdID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgU3ludGF4RXJyb3IoJ1ZhbHVlIGNvdWxkIG5vdCBiZSBjb252ZXJ0ZWQnKTtcbiAgICAgICAgfVxuXG4gICAgICAgIG9yaWdpbmFsLmVsZW1lbnRTY3JvbGwuY2FsbChcbiAgICAgICAgICB0aGlzLFxuICAgICAgICAgIC8vIHVzZSBsZWZ0IHByb3AsIGZpcnN0IG51bWJlciBhcmd1bWVudCBvciBmYWxsYmFjayB0byBzY3JvbGxMZWZ0XG4gICAgICAgICAgYXJndW1lbnRzWzBdLmxlZnQgIT09IHVuZGVmaW5lZFxuICAgICAgICAgICAgPyB+fmFyZ3VtZW50c1swXS5sZWZ0XG4gICAgICAgICAgICA6IHR5cGVvZiBhcmd1bWVudHNbMF0gIT09ICdvYmplY3QnID8gfn5hcmd1bWVudHNbMF0gOiB0aGlzLnNjcm9sbExlZnQsXG4gICAgICAgICAgLy8gdXNlIHRvcCBwcm9wLCBzZWNvbmQgYXJndW1lbnQgb3IgZmFsbGJhY2sgdG8gc2Nyb2xsVG9wXG4gICAgICAgICAgYXJndW1lbnRzWzBdLnRvcCAhPT0gdW5kZWZpbmVkXG4gICAgICAgICAgICA/IH5+YXJndW1lbnRzWzBdLnRvcFxuICAgICAgICAgICAgOiBhcmd1bWVudHNbMV0gIT09IHVuZGVmaW5lZCA/IH5+YXJndW1lbnRzWzFdIDogdGhpcy5zY3JvbGxUb3BcbiAgICAgICAgKTtcblxuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIHZhciBsZWZ0ID0gYXJndW1lbnRzWzBdLmxlZnQ7XG4gICAgICB2YXIgdG9wID0gYXJndW1lbnRzWzBdLnRvcDtcblxuICAgICAgLy8gTEVUIFRIRSBTTU9PVEhORVNTIEJFR0lOIVxuICAgICAgc21vb3RoU2Nyb2xsLmNhbGwoXG4gICAgICAgIHRoaXMsXG4gICAgICAgIHRoaXMsXG4gICAgICAgIHR5cGVvZiBsZWZ0ID09PSAndW5kZWZpbmVkJyA/IHRoaXMuc2Nyb2xsTGVmdCA6IH5+bGVmdCxcbiAgICAgICAgdHlwZW9mIHRvcCA9PT0gJ3VuZGVmaW5lZCcgPyB0aGlzLnNjcm9sbFRvcCA6IH5+dG9wXG4gICAgICApO1xuICAgIH07XG5cbiAgICAvLyBFbGVtZW50LnByb3RvdHlwZS5zY3JvbGxCeVxuICAgIEVsZW1lbnQucHJvdG90eXBlLnNjcm9sbEJ5ID0gZnVuY3Rpb24oKSB7XG4gICAgICAvLyBhdm9pZCBhY3Rpb24gd2hlbiBubyBhcmd1bWVudHMgYXJlIHBhc3NlZFxuICAgICAgaWYgKGFyZ3VtZW50c1swXSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgLy8gYXZvaWQgc21vb3RoIGJlaGF2aW9yIGlmIG5vdCByZXF1aXJlZFxuICAgICAgaWYgKHNob3VsZEJhaWxPdXQoYXJndW1lbnRzWzBdKSA9PT0gdHJ1ZSkge1xuICAgICAgICBvcmlnaW5hbC5lbGVtZW50U2Nyb2xsLmNhbGwoXG4gICAgICAgICAgdGhpcyxcbiAgICAgICAgICBhcmd1bWVudHNbMF0ubGVmdCAhPT0gdW5kZWZpbmVkXG4gICAgICAgICAgICA/IH5+YXJndW1lbnRzWzBdLmxlZnQgKyB0aGlzLnNjcm9sbExlZnRcbiAgICAgICAgICAgIDogfn5hcmd1bWVudHNbMF0gKyB0aGlzLnNjcm9sbExlZnQsXG4gICAgICAgICAgYXJndW1lbnRzWzBdLnRvcCAhPT0gdW5kZWZpbmVkXG4gICAgICAgICAgICA/IH5+YXJndW1lbnRzWzBdLnRvcCArIHRoaXMuc2Nyb2xsVG9wXG4gICAgICAgICAgICA6IH5+YXJndW1lbnRzWzFdICsgdGhpcy5zY3JvbGxUb3BcbiAgICAgICAgKTtcblxuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIHRoaXMuc2Nyb2xsKHtcbiAgICAgICAgbGVmdDogfn5hcmd1bWVudHNbMF0ubGVmdCArIHRoaXMuc2Nyb2xsTGVmdCxcbiAgICAgICAgdG9wOiB+fmFyZ3VtZW50c1swXS50b3AgKyB0aGlzLnNjcm9sbFRvcCxcbiAgICAgICAgYmVoYXZpb3I6IGFyZ3VtZW50c1swXS5iZWhhdmlvclxuICAgICAgfSk7XG4gICAgfTtcblxuICAgIC8vIEVsZW1lbnQucHJvdG90eXBlLnNjcm9sbEludG9WaWV3XG4gICAgRWxlbWVudC5wcm90b3R5cGUuc2Nyb2xsSW50b1ZpZXcgPSBmdW5jdGlvbigpIHtcbiAgICAgIC8vIGF2b2lkIHNtb290aCBiZWhhdmlvciBpZiBub3QgcmVxdWlyZWRcbiAgICAgIGlmIChzaG91bGRCYWlsT3V0KGFyZ3VtZW50c1swXSkgPT09IHRydWUpIHtcbiAgICAgICAgb3JpZ2luYWwuc2Nyb2xsSW50b1ZpZXcuY2FsbChcbiAgICAgICAgICB0aGlzLFxuICAgICAgICAgIGFyZ3VtZW50c1swXSA9PT0gdW5kZWZpbmVkID8gdHJ1ZSA6IGFyZ3VtZW50c1swXVxuICAgICAgICApO1xuXG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgLy8gTEVUIFRIRSBTTU9PVEhORVNTIEJFR0lOIVxuICAgICAgdmFyIHNjcm9sbGFibGVQYXJlbnQgPSBmaW5kU2Nyb2xsYWJsZVBhcmVudCh0aGlzKTtcbiAgICAgIHZhciBwYXJlbnRSZWN0cyA9IHNjcm9sbGFibGVQYXJlbnQuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG4gICAgICB2YXIgY2xpZW50UmVjdHMgPSB0aGlzLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xuXG4gICAgICBpZiAoc2Nyb2xsYWJsZVBhcmVudCAhPT0gZC5ib2R5KSB7XG4gICAgICAgIC8vIHJldmVhbCBlbGVtZW50IGluc2lkZSBwYXJlbnRcbiAgICAgICAgc21vb3RoU2Nyb2xsLmNhbGwoXG4gICAgICAgICAgdGhpcyxcbiAgICAgICAgICBzY3JvbGxhYmxlUGFyZW50LFxuICAgICAgICAgIHNjcm9sbGFibGVQYXJlbnQuc2Nyb2xsTGVmdCArIGNsaWVudFJlY3RzLmxlZnQgLSBwYXJlbnRSZWN0cy5sZWZ0LFxuICAgICAgICAgIHNjcm9sbGFibGVQYXJlbnQuc2Nyb2xsVG9wICsgY2xpZW50UmVjdHMudG9wIC0gcGFyZW50UmVjdHMudG9wXG4gICAgICAgICk7XG5cbiAgICAgICAgLy8gcmV2ZWFsIHBhcmVudCBpbiB2aWV3cG9ydCB1bmxlc3MgaXMgZml4ZWRcbiAgICAgICAgaWYgKHcuZ2V0Q29tcHV0ZWRTdHlsZShzY3JvbGxhYmxlUGFyZW50KS5wb3NpdGlvbiAhPT0gJ2ZpeGVkJykge1xuICAgICAgICAgIHcuc2Nyb2xsQnkoe1xuICAgICAgICAgICAgbGVmdDogcGFyZW50UmVjdHMubGVmdCxcbiAgICAgICAgICAgIHRvcDogcGFyZW50UmVjdHMudG9wLFxuICAgICAgICAgICAgYmVoYXZpb3I6ICdzbW9vdGgnXG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIHJldmVhbCBlbGVtZW50IGluIHZpZXdwb3J0XG4gICAgICAgIHcuc2Nyb2xsQnkoe1xuICAgICAgICAgIGxlZnQ6IGNsaWVudFJlY3RzLmxlZnQsXG4gICAgICAgICAgdG9wOiBjbGllbnRSZWN0cy50b3AsXG4gICAgICAgICAgYmVoYXZpb3I6ICdzbW9vdGgnXG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH07XG4gIH1cblxuICBpZiAodHlwZW9mIGV4cG9ydHMgPT09ICdvYmplY3QnICYmIHR5cGVvZiBtb2R1bGUgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgLy8gY29tbW9uanNcbiAgICBtb2R1bGUuZXhwb3J0cyA9IHsgcG9seWZpbGw6IHBvbHlmaWxsIH07XG4gIH0gZWxzZSB7XG4gICAgLy8gZ2xvYmFsXG4gICAgcG9seWZpbGwoKTtcbiAgfVxuXG59KCkpO1xuIiwiY29uc3QgREIgPSAnaHR0cHM6Ly9uZXh1cy1jYXRhbG9nLmZpcmViYXNlaW8uY29tL3Bvc3RzLmpzb24/YXV0aD03ZzdweUtLeWtOM041ZXdySW1oT2FTNnZ3ckZzYzVmS2tyazhlanpmJztcbmNvbnN0IGFscGhhYmV0ID0gWydhJywgJ2InLCAnYycsICdkJywgJ2UnLCAnZicsICdnJywgJ2gnLCAnaScsICdqJywgJ2snLCAnbCcsICdtJywgJ24nLCAnbycsICdwJywgJ3InLCAncycsICd0JywgJ3UnLCAndicsICd3JywgJ3knLCAneiddO1xuXG5jb25zdCAkbG9hZGluZyA9IEFycmF5LmZyb20oZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbCgnLmxvYWRpbmcnKSk7XG5jb25zdCAkbmF2ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2pzLW5hdicpO1xuY29uc3QgJHBhcmFsbGF4ID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignLnBhcmFsbGF4Jyk7XG5jb25zdCAkY29udGVudCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJy5jb250ZW50Jyk7XG5jb25zdCAkdGl0bGUgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnanMtdGl0bGUnKTtcbmNvbnN0ICRhcnJvdyA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJy5hcnJvdycpO1xuY29uc3QgJG1vZGFsID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignLm1vZGFsJyk7XG5jb25zdCAkbGlnaHRib3ggPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcubGlnaHRib3gnKTtcbmNvbnN0ICR2aWV3ID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignLmxpZ2h0Ym94LXZpZXcnKTtcblxuZXhwb3J0IHsgXG5cdERCLCBcblx0YWxwaGFiZXQsIFxuXHQkbG9hZGluZywgXG5cdCRuYXYsIFxuXHQkcGFyYWxsYXgsXG5cdCRjb250ZW50LFxuXHQkdGl0bGUsXG5cdCRhcnJvdyxcblx0JG1vZGFsLFxuXHQkbGlnaHRib3gsXG5cdCR2aWV3IFxufTsiLCJpbXBvcnQgc21vb3Roc2Nyb2xsIGZyb20gJ3Ntb290aHNjcm9sbC1wb2x5ZmlsbCc7XG5cbmltcG9ydCB7IGFydGljbGVUZW1wbGF0ZSwgbmF2TGcgfSBmcm9tICcuL3RlbXBsYXRlcyc7XG5pbXBvcnQgeyBkZWJvdW5jZSwgaGlkZUxvYWRpbmcgfSBmcm9tICcuL3V0aWxzJztcbmltcG9ydCB7IERCLCBhbHBoYWJldCwgJGxvYWRpbmcsICRuYXYsICRwYXJhbGxheCwgJGNvbnRlbnQsICR0aXRsZSwgJGFycm93LCAkbW9kYWwsICRsaWdodGJveCwgJHZpZXcgfSBmcm9tICcuL2NvbnN0YW50cyc7XG5cbmxldCBzb3J0S2V5ID0gMDsgLy8gMCA9IGFydGlzdCwgMSA9IHRpdGxlXG5sZXQgZW50cmllcyA9IHsgYnlBdXRob3I6IFtdLCBieVRpdGxlOiBbXSB9O1xubGV0IGN1cnJlbnRMZXR0ZXIgPSAnQSc7XG5sZXQgbW9kYWwgPSBmYWxzZTtcbmxldCBsaWdodGJveCA9IGZhbHNlO1xuXG5jb25zdCBhdHRhY2hJbWFnZUxpc3RlbmVycyA9ICgpID0+IHtcblx0Y29uc3QgJGltYWdlcyA9IEFycmF5LmZyb20oZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbCgnLmFydGljbGUtaW1hZ2UnKSk7XG5cblx0JGltYWdlcy5mb3JFYWNoKGltZyA9PiB7XG5cdFx0aW1nLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKGV2dCkgPT4ge1xuXHRcdFx0aWYgKCFsaWdodGJveCkge1xuXHRcdFx0XHRsZXQgc3JjID0gaW1nLnNyYztcblx0XHRcdFx0XG5cdFx0XHRcdCRsaWdodGJveC5jbGFzc0xpc3QuYWRkKCdzaG93LWltZycpO1xuXHRcdFx0XHQkdmlldy5zZXRBdHRyaWJ1dGUoJ3N0eWxlJywgYGJhY2tncm91bmQtaW1hZ2U6IHVybCgke3NyY30pYCk7XG5cdFx0XHRcdGxpZ2h0Ym94ID0gdHJ1ZTtcblx0XHRcdH1cblx0XHR9KTtcblx0fSk7XG5cblx0JHZpZXcuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoKSA9PiB7XG5cdFx0aWYgKGxpZ2h0Ym94KSB7XG5cdFx0XHQkbGlnaHRib3guY2xhc3NMaXN0LnJlbW92ZSgnc2hvdy1pbWcnKTtcblx0XHRcdGxpZ2h0Ym94ID0gZmFsc2U7XG5cdFx0fVxuXHR9KTtcbn07XG5cbmNvbnN0IGF0dGFjaE1vZGFsTGlzdGVuZXJzID0gKCkgPT4ge1xuXHRjb25zdCAkZmluZCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdqcy1maW5kJyk7XG5cdFxuXHQkZmluZC5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsICgpID0+IHtcblx0XHQkbW9kYWwuY2xhc3NMaXN0LmFkZCgnc2hvdycpO1xuXHRcdG1vZGFsID0gdHJ1ZTtcblx0fSk7XG5cblx0JG1vZGFsLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKCkgPT4ge1xuXHRcdCRtb2RhbC5jbGFzc0xpc3QucmVtb3ZlKCdzaG93Jyk7XG5cdFx0bW9kYWwgPSBmYWxzZTtcblx0fSk7XG5cblx0d2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ2tleWRvd24nLCAoKSA9PiB7XG5cdFx0aWYgKG1vZGFsKSB7XG5cdFx0XHRzZXRUaW1lb3V0KCgpID0+IHtcblx0XHRcdFx0JG1vZGFsLmNsYXNzTGlzdC5yZW1vdmUoJ3Nob3cnKTtcblx0XHRcdFx0bW9kYWwgPSBmYWxzZTtcblx0XHRcdH0sIDYwMCk7XG5cdFx0fTtcblx0fSk7XG59XG5cbmNvbnN0IHNjcm9sbFRvVG9wID0gKCkgPT4ge1xuXHRsZXQgdGhpbmcgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYW5jaG9yLXRhcmdldCcpO1xuXHR0aGluZy5zY3JvbGxJbnRvVmlldyh7YmVoYXZpb3I6IFwic21vb3RoXCIsIGJsb2NrOiBcInN0YXJ0XCJ9KTtcbn1cblxubGV0IHByZXY7XG5sZXQgY3VycmVudCA9IDA7XG5sZXQgaXNTaG93aW5nID0gZmFsc2U7XG5jb25zdCBhdHRhY2hBcnJvd0xpc3RlbmVycyA9ICgpID0+IHtcblx0JGFycm93LmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKCkgPT4ge1xuXHRcdHNjcm9sbFRvVG9wKCk7XG5cdH0pO1xuXG5cdCRwYXJhbGxheC5hZGRFdmVudExpc3RlbmVyKCdzY3JvbGwnLCAoKSA9PiB7XG5cblx0XHRsZXQgeSA9ICR0aXRsZS5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKS55O1xuXHRcdGlmIChjdXJyZW50ICE9PSB5KSB7XG5cdFx0XHRwcmV2ID0gY3VycmVudDtcblx0XHRcdGN1cnJlbnQgPSB5O1xuXHRcdH1cblxuXHRcdGlmICh5IDw9IC01MCAmJiAhaXNTaG93aW5nKSB7XG5cdFx0XHQkYXJyb3cuY2xhc3NMaXN0LmFkZCgnc2hvdycpO1xuXHRcdFx0aXNTaG93aW5nID0gdHJ1ZTtcblx0XHR9IGVsc2UgaWYgKHkgPiAtNTAgJiYgaXNTaG93aW5nKSB7XG5cdFx0XHQkYXJyb3cuY2xhc3NMaXN0LnJlbW92ZSgnc2hvdycpO1xuXHRcdFx0aXNTaG93aW5nID0gZmFsc2U7XG5cdFx0fVxuXHR9KTtcbn07XG5cbmNvbnN0IGFkZFNvcnRCdXR0b25MaXN0ZW5lcnMgPSAoKSA9PiB7XG5cdGxldCAkYnlBcnRpc3QgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnanMtYnktYXJ0aXN0Jyk7XG5cdGxldCAkYnlUaXRsZSA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdqcy1ieS10aXRsZScpO1xuXHQkYnlBcnRpc3QuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoKSA9PiB7XG5cdFx0aWYgKHNvcnRLZXkpIHtcblx0XHRcdHNjcm9sbFRvVG9wKCk7XG5cdFx0XHRzb3J0S2V5ID0gMDtcblx0XHRcdCRieUFydGlzdC5jbGFzc0xpc3QuYWRkKCdhY3RpdmUnKTtcblx0XHRcdCRieVRpdGxlLmNsYXNzTGlzdC5yZW1vdmUoJ2FjdGl2ZScpO1xuXG5cdFx0XHRyZW5kZXJFbnRyaWVzKCk7XG5cdFx0fVxuXHR9KTtcblxuXHQkYnlUaXRsZS5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsICgpID0+IHtcblx0XHRpZiAoIXNvcnRLZXkpIHtcblx0XHRcdHNjcm9sbFRvVG9wKCk7XG5cdFx0XHRzb3J0S2V5ID0gMTtcblx0XHRcdCRieVRpdGxlLmNsYXNzTGlzdC5hZGQoJ2FjdGl2ZScpO1xuXHRcdFx0JGJ5QXJ0aXN0LmNsYXNzTGlzdC5yZW1vdmUoJ2FjdGl2ZScpO1xuXG5cdFx0XHRyZW5kZXJFbnRyaWVzKCk7XG5cdFx0fVxuXHR9KTtcbn07XG5cbmNvbnN0IGNsZWFyQW5jaG9ycyA9IChwcmV2U2VsZWN0b3IpID0+IHtcblx0bGV0ICRlbnRyaWVzID0gQXJyYXkuZnJvbShkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKHByZXZTZWxlY3RvcikpO1xuXHQkZW50cmllcy5mb3JFYWNoKGVudHJ5ID0+IGVudHJ5LnJlbW92ZUF0dHJpYnV0ZSgnbmFtZScpKTtcbn07XG5cbmNvbnN0IGZpbmRGaXJzdEVudHJ5ID0gKGNoYXIpID0+IHtcblx0bGV0IHNlbGVjdG9yID0gc29ydEtleSA/ICcuanMtZW50cnktdGl0bGUnIDogJy5qcy1lbnRyeS1hcnRpc3QnO1xuXHRsZXQgcHJldlNlbGVjdG9yID0gIXNvcnRLZXkgPyAnLmpzLWVudHJ5LXRpdGxlJyA6ICcuanMtZW50cnktYXJ0aXN0Jztcblx0bGV0ICRlbnRyaWVzID0gQXJyYXkuZnJvbShkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKHNlbGVjdG9yKSk7XG5cblx0Y2xlYXJBbmNob3JzKHByZXZTZWxlY3Rvcik7XG5cblx0cmV0dXJuICRlbnRyaWVzLmZpbmQoZW50cnkgPT4ge1xuXHRcdGxldCBub2RlID0gZW50cnkubmV4dEVsZW1lbnRTaWJsaW5nO1xuXHRcdHJldHVybiBub2RlLmlubmVySFRNTFswXSA9PT0gY2hhciB8fCBub2RlLmlubmVySFRNTFswXSA9PT0gY2hhci50b1VwcGVyQ2FzZSgpO1xuXHR9KTtcbn07XG5cblxuY29uc3QgbWFrZUFscGhhYmV0ID0gKCkgPT4ge1xuXHRjb25zdCBhdHRhY2hBbmNob3JMaXN0ZW5lciA9ICgkYW5jaG9yLCBsZXR0ZXIpID0+IHtcblx0XHQkYW5jaG9yLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKCkgPT4ge1xuXHRcdFx0Y29uc3QgbGV0dGVyTm9kZSA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKGxldHRlcik7XG5cdFx0XHRsZXQgdGFyZ2V0O1xuXG5cdFx0XHRpZiAoIXNvcnRLZXkpIHtcblx0XHRcdFx0dGFyZ2V0ID0gbGV0dGVyID09PSAnYScgPyBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYW5jaG9yLXRhcmdldCcpIDogbGV0dGVyTm9kZS5wYXJlbnRFbGVtZW50LnBhcmVudEVsZW1lbnQucGFyZW50RWxlbWVudC5wYXJlbnRFbGVtZW50LnByZXZpb3VzRWxlbWVudFNpYmxpbmcucXVlcnlTZWxlY3RvcignLmpzLWFydGljbGUtYW5jaG9yLXRhcmdldCcpO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0dGFyZ2V0ID0gbGV0dGVyID09PSAnYScgPyBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYW5jaG9yLXRhcmdldCcpIDogbGV0dGVyTm9kZS5wYXJlbnRFbGVtZW50LnBhcmVudEVsZW1lbnQucGFyZW50RWxlbWVudC5wcmV2aW91c0VsZW1lbnRTaWJsaW5nLnF1ZXJ5U2VsZWN0b3IoJy5qcy1hcnRpY2xlLWFuY2hvci10YXJnZXQnKTtcblx0XHRcdH07XG5cblx0XHRcdHRhcmdldC5zY3JvbGxJbnRvVmlldyh7YmVoYXZpb3I6IFwic21vb3RoXCIsIGJsb2NrOiBcInN0YXJ0XCJ9KTtcblx0XHR9KTtcblx0fTtcblxuXHRsZXQgYWN0aXZlRW50cmllcyA9IHt9O1xuXHRsZXQgJG91dGVyID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignLmFscGhhYmV0X19sZXR0ZXJzJyk7XG5cdCRvdXRlci5pbm5lckhUTUwgPSAnJztcblxuXHRhbHBoYWJldC5mb3JFYWNoKGxldHRlciA9PiB7XG5cdFx0bGV0ICRmaXJzdEVudHJ5ID0gZmluZEZpcnN0RW50cnkobGV0dGVyKTtcblx0XHRsZXQgJGFuY2hvciA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2EnKTtcblxuXHRcdGlmICghJGZpcnN0RW50cnkpIHJldHVybjtcblxuXHRcdCRmaXJzdEVudHJ5LmlkID0gbGV0dGVyO1xuXHRcdCRhbmNob3IuaW5uZXJIVE1MID0gbGV0dGVyLnRvVXBwZXJDYXNlKCk7XG5cdFx0JGFuY2hvci5jbGFzc05hbWUgPSAnYWxwaGFiZXRfX2xldHRlci1hbmNob3InO1xuXG5cdFx0YXR0YWNoQW5jaG9yTGlzdGVuZXIoJGFuY2hvciwgbGV0dGVyKTtcblx0XHQkb3V0ZXIuYXBwZW5kQ2hpbGQoJGFuY2hvcik7XG5cdH0pO1xufTtcblxuY29uc3QgcmVuZGVySW1hZ2VzID0gKGltYWdlcywgJGltYWdlcykgPT4ge1xuXHRpbWFnZXMuZm9yRWFjaChpbWFnZSA9PiB7XG5cdFx0Y29uc3Qgc3JjID0gYC4uLy4uL2Fzc2V0cy9pbWFnZXMvJHtpbWFnZX1gO1xuXHRcdGNvbnN0ICRpbWdPdXRlciA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuXHRcdGNvbnN0ICRpbWcgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdJTUcnKTtcblx0XHQkaW1nLmNsYXNzTmFtZSA9ICdhcnRpY2xlLWltYWdlJztcblx0XHQkaW1nLnNyYyA9IHNyYztcblx0XHQkaW1nT3V0ZXIuYXBwZW5kQ2hpbGQoJGltZyk7XG5cdFx0JGltYWdlcy5hcHBlbmRDaGlsZCgkaW1nT3V0ZXIpO1xuXHR9KVxufTtcblxuY29uc3QgcmVuZGVyRW50cmllcyA9ICgpID0+IHtcblx0Y29uc3QgJGFydGljbGVMaXN0ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2pzLWxpc3QnKTtcblx0Y29uc3QgZW50cmllc0xpc3QgPSBzb3J0S2V5ID8gZW50cmllcy5ieVRpdGxlIDogZW50cmllcy5ieUF1dGhvcjtcblxuXHQkYXJ0aWNsZUxpc3QuaW5uZXJIVE1MID0gJyc7XG5cblx0ZW50cmllc0xpc3QuZm9yRWFjaChlbnRyeSA9PiB7XG5cdFx0Y29uc3QgeyB0aXRsZSwgbGFzdE5hbWUsIGZpcnN0TmFtZSwgaW1hZ2VzLCBkZXNjcmlwdGlvbiwgZGV0YWlsIH0gPSBlbnRyeTtcblxuXHRcdCRhcnRpY2xlTGlzdC5pbnNlcnRBZGphY2VudEhUTUwoJ2JlZm9yZWVuZCcsIGFydGljbGVUZW1wbGF0ZSk7XG5cblx0XHRjb25zdCAkYWxsU2xpZGVycyA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoJy5hcnRpY2xlX19zbGlkZXItaW5uZXInKTtcblx0XHRjb25zdCAkc2xpZGVyID0gJGFsbFNsaWRlcnNbJGFsbFNsaWRlcnMubGVuZ3RoIC0gMV07XG5cdFx0Ly8gY29uc3QgJGltYWdlcyA9ICRzbGlkZXIucXVlcnlTZWxlY3RvcignLmFydGljbGVfX2ltYWdlcycpO1xuXG5cdFx0aWYgKGltYWdlcy5sZW5ndGgpIHJlbmRlckltYWdlcyhpbWFnZXMsICRzbGlkZXIpO1xuXHRcdFxuXHRcdGNvbnN0ICRkZXNjcmlwdGlvbk91dGVyID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG5cdFx0Y29uc3QgJGRlc2NyaXB0aW9uTm9kZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3AnKTtcblx0XHRjb25zdCAkZGV0YWlsTm9kZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3AnKTtcblx0XHQkZGVzY3JpcHRpb25PdXRlci5jbGFzc0xpc3QuYWRkKCdhcnRpY2xlLWRlc2NyaXB0aW9uX19vdXRlcicpO1xuXHRcdCRkZXNjcmlwdGlvbk5vZGUuY2xhc3NMaXN0LmFkZCgnYXJ0aWNsZS1kZXNjcmlwdGlvbicpO1xuXHRcdCRkZXRhaWxOb2RlLmNsYXNzTGlzdC5hZGQoJ2FydGljbGUtZGV0YWlsJyk7XG5cblx0XHQkZGVzY3JpcHRpb25Ob2RlLmlubmVySFRNTCA9IGRlc2NyaXB0aW9uO1xuXHRcdCRkZXRhaWxOb2RlLmlubmVySFRNTCA9IGRldGFpbDtcblxuXHRcdCRkZXNjcmlwdGlvbk91dGVyLmFwcGVuZENoaWxkKCRkZXNjcmlwdGlvbk5vZGUsICRkZXRhaWxOb2RlKTtcblx0XHQkc2xpZGVyLmFwcGVuZENoaWxkKCRkZXNjcmlwdGlvbk91dGVyKTtcblxuXHRcdGNvbnN0ICR0aXRsZU5vZGVzID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbCgnLmFydGljbGUtaGVhZGluZ19fdGl0bGUnKTtcblx0XHRjb25zdCAkdGl0bGUgPSAkdGl0bGVOb2Rlc1skdGl0bGVOb2Rlcy5sZW5ndGggLSAxXTtcblxuXHRcdGNvbnN0ICRmaXJzdE5vZGVzID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbCgnLmFydGljbGUtaGVhZGluZ19fbmFtZS0tZmlyc3QnKTtcblx0XHRjb25zdCAkZmlyc3QgPSAkZmlyc3ROb2Rlc1skZmlyc3ROb2Rlcy5sZW5ndGggLSAxXTtcblxuXHRcdGNvbnN0ICRsYXN0Tm9kZXMgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKCcuYXJ0aWNsZS1oZWFkaW5nX19uYW1lLS1sYXN0Jyk7XG5cdFx0Y29uc3QgJGxhc3QgPSAkbGFzdE5vZGVzWyRsYXN0Tm9kZXMubGVuZ3RoIC0gMV07XG5cblx0XHQkdGl0bGUuaW5uZXJIVE1MID0gdGl0bGU7XG5cdFx0JGZpcnN0LmlubmVySFRNTCA9IGZpcnN0TmFtZTtcblx0XHQkbGFzdC5pbm5lckhUTUwgPSBsYXN0TmFtZTtcblxuXHRcdGNvbnN0ICRhcnJvd05leHQgPSAkc2xpZGVyLnBhcmVudEVsZW1lbnQucXVlcnlTZWxlY3RvcignLmFycm93LW5leHQnKTtcblx0XHRjb25zdCAkYXJyb3dQcmV2ID0gJHNsaWRlci5wYXJlbnRFbGVtZW50LnF1ZXJ5U2VsZWN0b3IoJy5hcnJvdy1wcmV2Jyk7XG5cblx0XHRsZXQgY3VycmVudCA9ICRzbGlkZXIuZmlyc3RFbGVtZW50Q2hpbGQ7XG5cdFx0JGFycm93TmV4dC5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsICgpID0+IHtcblx0XHRcdGNvbnN0IG5leHQgPSBjdXJyZW50Lm5leHRFbGVtZW50U2libGluZztcblx0XHRcdGlmIChuZXh0KSB7XG5cdFx0XHRcdG5leHQuc2Nyb2xsSW50b1ZpZXcoe2JlaGF2aW9yOiBcInNtb290aFwiLCBibG9jazogXCJuZWFyZXN0XCIsIGlubGluZTogXCJjZW50ZXJcIn0pO1xuXHRcdFx0XHRjdXJyZW50ID0gbmV4dDtcblx0XHRcdH1cblx0XHR9KTtcblxuXHRcdCRhcnJvd1ByZXYuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoKSA9PiB7XG5cdFx0XHRjb25zdCBwcmV2ID0gY3VycmVudC5wcmV2aW91c0VsZW1lbnRTaWJsaW5nO1xuXHRcdFx0aWYgKHByZXYpIHtcblx0XHRcdFx0cHJldi5zY3JvbGxJbnRvVmlldyh7YmVoYXZpb3I6IFwic21vb3RoXCIsIGJsb2NrOiBcIm5lYXJlc3RcIiwgaW5saW5lOiBcImNlbnRlclwifSk7XG5cdFx0XHRcdGN1cnJlbnQgPSBwcmV2O1xuXHRcdFx0fVxuXHRcdH0pXG5cdH0pO1xuXG5cdGF0dGFjaEltYWdlTGlzdGVuZXJzKCk7XG5cdG1ha2VBbHBoYWJldCgpO1xufTtcblxuLy8gdGhpcyBuZWVkcyB0byBiZSBhIGRlZXBlciBzb3J0XG5jb25zdCBzb3J0QnlUaXRsZSA9ICgpID0+IHtcblx0ZW50cmllcy5ieVRpdGxlLnNvcnQoKGEsIGIpID0+IHtcblx0XHRsZXQgYVRpdGxlID0gYS50aXRsZVswXS50b1VwcGVyQ2FzZSgpO1xuXHRcdGxldCBiVGl0bGUgPSBiLnRpdGxlWzBdLnRvVXBwZXJDYXNlKCk7XG5cdFx0aWYgKGFUaXRsZSA+IGJUaXRsZSkgcmV0dXJuIDE7XG5cdFx0ZWxzZSBpZiAoYVRpdGxlIDwgYlRpdGxlKSByZXR1cm4gLTE7XG5cdFx0ZWxzZSByZXR1cm4gMDtcblx0fSk7XG59O1xuXG5jb25zdCBzZXREYXRhID0gKGRhdGEpID0+IHtcblx0ZW50cmllcy5ieUF1dGhvciA9IGRhdGE7XG5cdGVudHJpZXMuYnlUaXRsZSA9IGRhdGEuc2xpY2UoKTsgLy8gY29waWVzIGRhdGEgZm9yIGJ5VGl0bGUgc29ydFxuXG5cdHNvcnRCeVRpdGxlKCk7XG5cdHJlbmRlckVudHJpZXMoKTtcbn07XG5cbmNvbnN0IGZldGNoRGF0YSA9ICgpID0+IHtcblx0ZmV0Y2goREIpLnRoZW4ocmVzID0+IHJlcy5qc29uKCkpXG5cdC50aGVuKGRhdGEgPT4ge1xuXHRcdHNldERhdGEoZGF0YSk7XG5cdFx0aGlkZUxvYWRpbmcoKTtcblx0fSlcblx0LmNhdGNoKGVyciA9PiBjb25zb2xlLndhcm4oZXJyKSk7XG59O1xuXG5jb25zdCBpbml0ID0gKCkgPT4ge1xuXHRzbW9vdGhzY3JvbGwucG9seWZpbGwoKTtcblx0ZmV0Y2hEYXRhKCk7XG5cdG5hdkxnKCk7XG5cdGFkZFNvcnRCdXR0b25MaXN0ZW5lcnMoKTtcblx0YXR0YWNoQXJyb3dMaXN0ZW5lcnMoKTtcblx0YXR0YWNoTW9kYWxMaXN0ZW5lcnMoKTtcbn1cblxuaW5pdCgpO1xuIiwiY29uc3QgYXJ0aWNsZVRlbXBsYXRlID0gYFxuXHQ8YXJ0aWNsZSBjbGFzcz1cImFydGljbGVfX291dGVyXCI+XG5cdFx0PGRpdiBjbGFzcz1cImFydGljbGVfX2lubmVyXCI+XG5cdFx0XHQ8ZGl2IGNsYXNzPVwiYXJ0aWNsZV9faGVhZGluZ1wiPlxuXHRcdFx0XHQ8YSBjbGFzcz1cImpzLWVudHJ5LXRpdGxlXCI+PC9hPlxuXHRcdFx0XHQ8aDIgY2xhc3M9XCJhcnRpY2xlLWhlYWRpbmdfX3RpdGxlXCI+PC9oMj5cblx0XHRcdFx0PGRpdiBjbGFzcz1cImFydGljbGUtaGVhZGluZ19fbmFtZVwiPlxuXHRcdFx0XHRcdDxzcGFuIGNsYXNzPVwiYXJ0aWNsZS1oZWFkaW5nX19uYW1lLS1maXJzdFwiPjwvc3Bhbj5cblx0XHRcdFx0XHQ8YSBjbGFzcz1cImpzLWVudHJ5LWFydGlzdFwiPjwvYT5cblx0XHRcdFx0XHQ8c3BhbiBjbGFzcz1cImFydGljbGUtaGVhZGluZ19fbmFtZS0tbGFzdFwiPjwvc3Bhbj5cblx0XHRcdFx0PC9kaXY+XG5cdFx0XHQ8L2Rpdj5cdFxuXHRcdFx0PGRpdiBjbGFzcz1cImFydGljbGVfX3NsaWRlci1vdXRlclwiPlxuXHRcdFx0XHQ8ZGl2IGNsYXNzPVwiYXJ0aWNsZV9fc2xpZGVyLWlubmVyXCI+PC9kaXY+XG5cdFx0XHRcdDxkaXYgY2xhc3M9XCJhcnRpY2xlX19zY3JvbGwtY29udHJvbHNcIj5cblx0XHRcdFx0XHQ8c3BhbiBjbGFzcz1cImNvbnRyb2xzIGFycm93LXByZXZcIj7ihpA8L3NwYW4+IFxuXHRcdFx0XHRcdDxzcGFuIGNsYXNzPVwiY29udHJvbHMgYXJyb3ctbmV4dFwiPuKGkjwvc3Bhbj5cblx0XHRcdFx0PC9kaXY+XG5cdFx0XHRcdDxwIGNsYXNzPVwianMtYXJ0aWNsZS1hbmNob3ItdGFyZ2V0XCI+PC9wPlxuXHRcdDwvZGl2PlxuXHQ8L2FydGljbGU+XG5gO1xuXG5leHBvcnQgZGVmYXVsdCBhcnRpY2xlVGVtcGxhdGU7IiwiaW1wb3J0IGFydGljbGVUZW1wbGF0ZSBmcm9tICcuL2FydGljbGUnO1xuaW1wb3J0IG5hdkxnIGZyb20gJy4vbmF2TGcnO1xuXG5leHBvcnQgeyBhcnRpY2xlVGVtcGxhdGUsIG5hdkxnIH07IiwiY29uc3QgdGVtcGxhdGUgPSBcblx0YDxkaXYgY2xhc3M9XCJuYXZfX2lubmVyXCI+XG5cdFx0PGRpdiBjbGFzcz1cIm5hdl9fc29ydC1ieVwiPlxuXHRcdFx0PHNwYW4gY2xhc3M9XCJzb3J0LWJ5X190aXRsZVwiPlNvcnQgYnk8L3NwYW4+XG5cdFx0XHQ8YnV0dG9uIGNsYXNzPVwic29ydC1ieSBzb3J0LWJ5X19ieS1hcnRpc3QgYWN0aXZlXCIgaWQ9XCJqcy1ieS1hcnRpc3RcIj5BcnRpc3Q8L2J1dHRvbj5cblx0XHRcdDxzcGFuIGNsYXNzPVwic29ydC1ieV9fZGl2aWRlclwiPiB8IDwvc3Bhbj5cblx0XHRcdDxidXR0b24gY2xhc3M9XCJzb3J0LWJ5IHNvcnQtYnlfX2J5LXRpdGxlXCIgaWQ9XCJqcy1ieS10aXRsZVwiPlRpdGxlPC9idXR0b24+XG5cdFx0XHQ8c3BhbiBjbGFzcz1cImZpbmRcIiBpZD1cImpzLWZpbmRcIj5cblx0XHRcdFx0KDxzcGFuIGNsYXNzPVwiZmluZC0taW5uZXJcIj4mIzg5ODQ7Rjwvc3Bhbj4pXG5cdFx0XHQ8L3NwYW4+XG5cdFx0PC9kaXY+XG5cdFx0PGRpdiBjbGFzcz1cIm5hdl9fYWxwaGFiZXRcIj5cblx0XHRcdDxzcGFuIGNsYXNzPVwiYWxwaGFiZXRfX3RpdGxlXCI+R28gdG88L3NwYW4+XG5cdFx0XHQ8ZGl2IGNsYXNzPVwiYWxwaGFiZXRfX2xldHRlcnNcIj48L2Rpdj5cblx0XHQ8L2Rpdj5cblx0PC9kaXY+YDtcblxuY29uc3QgbmF2TGcgPSAoKSA9PiB7XG5cdGxldCBuYXZPdXRlciA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdqcy1uYXYnKTtcblx0bmF2T3V0ZXIuaW5uZXJIVE1MID0gdGVtcGxhdGU7XG59O1xuXG5leHBvcnQgZGVmYXVsdCBuYXZMZzsiLCJpbXBvcnQgeyBEQiwgYWxwaGFiZXQsICRsb2FkaW5nLCAkbmF2LCAkcGFyYWxsYXgsICRjb250ZW50LCAkdGl0bGUsICRhcnJvdywgJG1vZGFsLCAkbGlnaHRib3gsICR2aWV3IH0gZnJvbSAnLi4vY29uc3RhbnRzJztcblxuY29uc3QgZGVib3VuY2UgPSAoZm4sIHRpbWUpID0+IHtcbiAgbGV0IHRpbWVvdXQ7XG5cbiAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgIGNvbnN0IGZ1bmN0aW9uQ2FsbCA9ICgpID0+IGZuLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgXG4gICAgY2xlYXJUaW1lb3V0KHRpbWVvdXQpO1xuICAgIHRpbWVvdXQgPSBzZXRUaW1lb3V0KGZ1bmN0aW9uQ2FsbCwgdGltZSk7XG4gIH1cbn07XG5cbmNvbnN0IGhpZGVMb2FkaW5nID0gKCkgPT4ge1xuXHQkbG9hZGluZy5mb3JFYWNoKGVsZW0gPT4ge1xuXHRcdGVsZW0uY2xhc3NMaXN0LnJlbW92ZSgnbG9hZGluZycpO1xuXHRcdGVsZW0uY2xhc3NMaXN0LmFkZCgncmVhZHknKTtcblx0fSk7XG5cdCRuYXYuY2xhc3NMaXN0LmFkZCgncmVhZHknKTtcbn07XG5cbmV4cG9ydCB7IGRlYm91bmNlLCBoaWRlTG9hZGluZyB9OyJdLCJwcmVFeGlzdGluZ0NvbW1lbnQiOiIvLyMgc291cmNlTWFwcGluZ1VSTD1kYXRhOmFwcGxpY2F0aW9uL2pzb247Y2hhcnNldD11dGYtODtiYXNlNjQsZXlKMlpYSnphVzl1SWpvekxDSnpiM1Z5WTJWeklqcGJJbTV2WkdWZmJXOWtkV3hsY3k5aWNtOTNjMlZ5TFhCaFkyc3ZYM0J5Wld4MVpHVXVhbk1pTENKdWIyUmxYMjF2WkhWc1pYTXZjMjF2YjNSb2MyTnliMnhzTFhCdmJIbG1hV3hzTDJScGMzUXZjMjF2YjNSb2MyTnliMnhzTG1weklpd2ljM0pqTDJwekwyTnZibk4wWVc1MGN5NXFjeUlzSW5OeVl5OXFjeTlwYm1SbGVDNXFjeUlzSW5OeVl5OXFjeTkwWlcxd2JHRjBaWE12WVhKMGFXTnNaUzVxY3lJc0luTnlZeTlxY3k5MFpXMXdiR0YwWlhNdmFXNWtaWGd1YW5NaUxDSnpjbU12YW5NdmRHVnRjR3hoZEdWekwyNWhka3huTG1weklpd2ljM0pqTDJwekwzVjBhV3h6TDJsdVpHVjRMbXB6SWwwc0ltNWhiV1Z6SWpwYlhTd2liV0Z3Y0dsdVozTWlPaUpCUVVGQk8wRkRRVUU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHM3T3pzN096dEJRM1ppUVN4SlFVRk5MRXRCUVVzc0swWkJRVmc3UVVGRFFTeEpRVUZOTEZkQlFWY3NRMEZCUXl4SFFVRkVMRVZCUVUwc1IwRkJUaXhGUVVGWExFZEJRVmdzUlVGQlowSXNSMEZCYUVJc1JVRkJjVUlzUjBGQmNrSXNSVUZCTUVJc1IwRkJNVUlzUlVGQkswSXNSMEZCTDBJc1JVRkJiME1zUjBGQmNFTXNSVUZCZVVNc1IwRkJla01zUlVGQk9FTXNSMEZCT1VNc1JVRkJiVVFzUjBGQmJrUXNSVUZCZDBRc1IwRkJlRVFzUlVGQk5rUXNSMEZCTjBRc1JVRkJhMFVzUjBGQmJFVXNSVUZCZFVVc1IwRkJka1VzUlVGQk5FVXNSMEZCTlVVc1JVRkJhVVlzUjBGQmFrWXNSVUZCYzBZc1IwRkJkRVlzUlVGQk1rWXNSMEZCTTBZc1JVRkJaMGNzUjBGQmFFY3NSVUZCY1Vjc1IwRkJja2NzUlVGQk1FY3NSMEZCTVVjc1JVRkJLMGNzUjBGQkwwY3NSVUZCYjBnc1IwRkJjRWdzUTBGQmFrSTdPMEZCUlVFc1NVRkJUU3hYUVVGWExFMUJRVTBzU1VGQlRpeERRVUZYTEZOQlFWTXNaMEpCUVZRc1EwRkJNRUlzVlVGQk1VSXNRMEZCV0N4RFFVRnFRanRCUVVOQkxFbEJRVTBzVDBGQlR5eFRRVUZUTEdOQlFWUXNRMEZCZDBJc1VVRkJlRUlzUTBGQllqdEJRVU5CTEVsQlFVMHNXVUZCV1N4VFFVRlRMR0ZCUVZRc1EwRkJkVUlzVjBGQmRrSXNRMEZCYkVJN1FVRkRRU3hKUVVGTkxGZEJRVmNzVTBGQlV5eGhRVUZVTEVOQlFYVkNMRlZCUVhaQ0xFTkJRV3BDTzBGQlEwRXNTVUZCVFN4VFFVRlRMRk5CUVZNc1kwRkJWQ3hEUVVGM1FpeFZRVUY0UWl4RFFVRm1PMEZCUTBFc1NVRkJUU3hUUVVGVExGTkJRVk1zWVVGQlZDeERRVUYxUWl4UlFVRjJRaXhEUVVGbU8wRkJRMEVzU1VGQlRTeFRRVUZUTEZOQlFWTXNZVUZCVkN4RFFVRjFRaXhSUVVGMlFpeERRVUZtTzBGQlEwRXNTVUZCVFN4WlFVRlpMRk5CUVZNc1lVRkJWQ3hEUVVGMVFpeFhRVUYyUWl4RFFVRnNRanRCUVVOQkxFbEJRVTBzVVVGQlVTeFRRVUZUTEdGQlFWUXNRMEZCZFVJc1owSkJRWFpDTEVOQlFXUTdPMUZCUjBNc1JTeEhRVUZCTEVVN1VVRkRRU3hSTEVkQlFVRXNVVHRSUVVOQkxGRXNSMEZCUVN4Uk8xRkJRMEVzU1N4SFFVRkJMRWs3VVVGRFFTeFRMRWRCUVVFc1V6dFJRVU5CTEZFc1IwRkJRU3hSTzFGQlEwRXNUU3hIUVVGQkxFMDdVVUZEUVN4TkxFZEJRVUVzVFR0UlFVTkJMRTBzUjBGQlFTeE5PMUZCUTBFc1V5eEhRVUZCTEZNN1VVRkRRU3hMTEVkQlFVRXNTenM3T3pzN1FVTjRRa1E3T3pzN1FVRkZRVHM3UVVGRFFUczdRVUZEUVRzN096dEJRVVZCTEVsQlFVa3NWVUZCVlN4RFFVRmtMRU1zUTBGQmFVSTdRVUZEYWtJc1NVRkJTU3hWUVVGVkxFVkJRVVVzVlVGQlZTeEZRVUZhTEVWQlFXZENMRk5CUVZNc1JVRkJla0lzUlVGQlpEdEJRVU5CTEVsQlFVa3NaMEpCUVdkQ0xFZEJRWEJDTzBGQlEwRXNTVUZCU1N4UlFVRlJMRXRCUVZvN1FVRkRRU3hKUVVGSkxGZEJRVmNzUzBGQlpqczdRVUZGUVN4SlFVRk5MSFZDUVVGMVFpeFRRVUYyUWl4dlFrRkJkVUlzUjBGQlRUdEJRVU5zUXl4TFFVRk5MRlZCUVZVc1RVRkJUU3hKUVVGT0xFTkJRVmNzVTBGQlV5eG5Ra0ZCVkN4RFFVRXdRaXhuUWtGQk1VSXNRMEZCV0N4RFFVRm9RanM3UVVGRlFTeFRRVUZSTEU5QlFWSXNRMEZCWjBJc1pVRkJUenRCUVVOMFFpeE5RVUZKTEdkQ1FVRktMRU5CUVhGQ0xFOUJRWEpDTEVWQlFUaENMRlZCUVVNc1IwRkJSQ3hGUVVGVE8wRkJRM1JETEU5QlFVa3NRMEZCUXl4UlFVRk1MRVZCUVdVN1FVRkRaQ3hSUVVGSkxFMUJRVTBzU1VGQlNTeEhRVUZrT3p0QlFVVkJMSGxDUVVGVkxGTkJRVllzUTBGQmIwSXNSMEZCY0VJc1EwRkJkMElzVlVGQmVFSTdRVUZEUVN4eFFrRkJUU3haUVVGT0xFTkJRVzFDTEU5QlFXNUNMRFpDUVVGeFJDeEhRVUZ5UkR0QlFVTkJMR1ZCUVZjc1NVRkJXRHRCUVVOQk8wRkJRMFFzUjBGU1JEdEJRVk5CTEVWQlZrUTdPMEZCV1VFc2EwSkJRVTBzWjBKQlFVNHNRMEZCZFVJc1QwRkJka0lzUlVGQlowTXNXVUZCVFR0QlFVTnlReXhOUVVGSkxGRkJRVW9zUlVGQll6dEJRVU5pTEhkQ1FVRlZMRk5CUVZZc1EwRkJiMElzVFVGQmNFSXNRMEZCTWtJc1ZVRkJNMEk3UVVGRFFTeGpRVUZYTEV0QlFWZzdRVUZEUVR0QlFVTkVMRVZCVEVRN1FVRk5RU3hEUVhKQ1JEczdRVUYxUWtFc1NVRkJUU3gxUWtGQmRVSXNVMEZCZGtJc2IwSkJRWFZDTEVkQlFVMDdRVUZEYkVNc1MwRkJUU3hSUVVGUkxGTkJRVk1zWTBGQlZDeERRVUYzUWl4VFFVRjRRaXhEUVVGa096dEJRVVZCTEU5QlFVMHNaMEpCUVU0c1EwRkJkVUlzVDBGQmRrSXNSVUZCWjBNc1dVRkJUVHRCUVVOeVF5eHZRa0ZCVHl4VFFVRlFMRU5CUVdsQ0xFZEJRV3BDTEVOQlFYRkNMRTFCUVhKQ08wRkJRMEVzVlVGQlVTeEpRVUZTTzBGQlEwRXNSVUZJUkRzN1FVRkxRU3h0UWtGQlR5eG5Ra0ZCVUN4RFFVRjNRaXhQUVVGNFFpeEZRVUZwUXl4WlFVRk5PMEZCUTNSRExHOUNRVUZQTEZOQlFWQXNRMEZCYVVJc1RVRkJha0lzUTBGQmQwSXNUVUZCZUVJN1FVRkRRU3hWUVVGUkxFdEJRVkk3UVVGRFFTeEZRVWhFT3p0QlFVdEJMRkZCUVU4c1owSkJRVkFzUTBGQmQwSXNVMEZCZUVJc1JVRkJiVU1zV1VGQlRUdEJRVU40UXl4TlFVRkpMRXRCUVVvc1JVRkJWenRCUVVOV0xHTkJRVmNzV1VGQlRUdEJRVU5vUWl4elFrRkJUeXhUUVVGUUxFTkJRV2xDTEUxQlFXcENMRU5CUVhkQ0xFMUJRWGhDTzBGQlEwRXNXVUZCVVN4TFFVRlNPMEZCUTBFc1NVRklSQ3hGUVVkSExFZEJTRWc3UVVGSlFUdEJRVU5FTEVWQlVFUTdRVUZSUVN4RFFYSkNSRHM3UVVGMVFrRXNTVUZCVFN4alFVRmpMRk5CUVdRc1YwRkJZeXhIUVVGTk8wRkJRM3BDTEV0QlFVa3NVVUZCVVN4VFFVRlRMR05CUVZRc1EwRkJkMElzWlVGQmVFSXNRMEZCV2p0QlFVTkJMRTlCUVUwc1kwRkJUaXhEUVVGeFFpeEZRVUZETEZWQlFWVXNVVUZCV0N4RlFVRnhRaXhQUVVGUExFOUJRVFZDTEVWQlFYSkNPMEZCUTBFc1EwRklSRHM3UVVGTFFTeEpRVUZKTEdGQlFVbzdRVUZEUVN4SlFVRkpMRlZCUVZVc1EwRkJaRHRCUVVOQkxFbEJRVWtzV1VGQldTeExRVUZvUWp0QlFVTkJMRWxCUVUwc2RVSkJRWFZDTEZOQlFYWkNMRzlDUVVGMVFpeEhRVUZOTzBGQlEyeERMRzFDUVVGUExHZENRVUZRTEVOQlFYZENMRTlCUVhoQ0xFVkJRV2xETEZsQlFVMDdRVUZEZEVNN1FVRkRRU3hGUVVaRU96dEJRVWxCTEhOQ1FVRlZMR2RDUVVGV0xFTkJRVEpDTEZGQlFUTkNMRVZCUVhGRExGbEJRVTA3TzBGQlJURkRMRTFCUVVrc1NVRkJTU3hyUWtGQlR5eHhRa0ZCVUN4SFFVRXJRaXhEUVVGMlF6dEJRVU5CTEUxQlFVa3NXVUZCV1N4RFFVRm9RaXhGUVVGdFFqdEJRVU5zUWl4VlFVRlBMRTlCUVZBN1FVRkRRU3hoUVVGVkxFTkJRVlk3UVVGRFFUczdRVUZGUkN4TlFVRkpMRXRCUVVzc1EwRkJReXhGUVVGT0xFbEJRVmtzUTBGQlF5eFRRVUZxUWl4RlFVRTBRanRCUVVNelFpeHhRa0ZCVHl4VFFVRlFMRU5CUVdsQ0xFZEJRV3BDTEVOQlFYRkNMRTFCUVhKQ08wRkJRMEVzWlVGQldTeEpRVUZhTzBGQlEwRXNSMEZJUkN4TlFVZFBMRWxCUVVrc1NVRkJTU3hEUVVGRExFVkJRVXdzU1VGQlZ5eFRRVUZtTEVWQlFUQkNPMEZCUTJoRExIRkNRVUZQTEZOQlFWQXNRMEZCYVVJc1RVRkJha0lzUTBGQmQwSXNUVUZCZUVJN1FVRkRRU3hsUVVGWkxFdEJRVm83UVVGRFFUdEJRVU5FTEVWQlprUTdRVUZuUWtFc1EwRnlRa1E3TzBGQmRVSkJMRWxCUVUwc2VVSkJRWGxDTEZOQlFYcENMSE5DUVVGNVFpeEhRVUZOTzBGQlEzQkRMRXRCUVVrc1dVRkJXU3hUUVVGVExHTkJRVlFzUTBGQmQwSXNZMEZCZUVJc1EwRkJhRUk3UVVGRFFTeExRVUZKTEZkQlFWY3NVMEZCVXl4alFVRlVMRU5CUVhkQ0xHRkJRWGhDTEVOQlFXWTdRVUZEUVN4WFFVRlZMR2RDUVVGV0xFTkJRVEpDTEU5QlFUTkNMRVZCUVc5RExGbEJRVTA3UVVGRGVrTXNUVUZCU1N4UFFVRktMRVZCUVdFN1FVRkRXanRCUVVOQkxHRkJRVlVzUTBGQlZqdEJRVU5CTEdGQlFWVXNVMEZCVml4RFFVRnZRaXhIUVVGd1FpeERRVUYzUWl4UlFVRjRRanRCUVVOQkxGbEJRVk1zVTBGQlZDeERRVUZ0UWl4TlFVRnVRaXhEUVVFd1FpeFJRVUV4UWpzN1FVRkZRVHRCUVVOQk8wRkJRMFFzUlVGVVJEczdRVUZYUVN4VlFVRlRMR2RDUVVGVUxFTkJRVEJDTEU5QlFURkNMRVZCUVcxRExGbEJRVTA3UVVGRGVFTXNUVUZCU1N4RFFVRkRMRTlCUVV3c1JVRkJZenRCUVVOaU8wRkJRMEVzWVVGQlZTeERRVUZXTzBGQlEwRXNXVUZCVXl4VFFVRlVMRU5CUVcxQ0xFZEJRVzVDTEVOQlFYVkNMRkZCUVhaQ08wRkJRMEVzWVVGQlZTeFRRVUZXTEVOQlFXOUNMRTFCUVhCQ0xFTkJRVEpDTEZGQlFUTkNPenRCUVVWQk8wRkJRMEU3UVVGRFJDeEZRVlJFTzBGQlZVRXNRMEY0UWtRN08wRkJNRUpCTEVsQlFVMHNaVUZCWlN4VFFVRm1MRmxCUVdVc1EwRkJReXhaUVVGRUxFVkJRV3RDTzBGQlEzUkRMRXRCUVVrc1YwRkJWeXhOUVVGTkxFbEJRVTRzUTBGQlZ5eFRRVUZUTEdkQ1FVRlVMRU5CUVRCQ0xGbEJRVEZDTEVOQlFWZ3NRMEZCWmp0QlFVTkJMRlZCUVZNc1QwRkJWQ3hEUVVGcFFqdEJRVUZCTEZOQlFWTXNUVUZCVFN4bFFVRk9MRU5CUVhOQ0xFMUJRWFJDTEVOQlFWUTdRVUZCUVN4RlFVRnFRanRCUVVOQkxFTkJTRVE3TzBGQlMwRXNTVUZCVFN4cFFrRkJhVUlzVTBGQmFrSXNZMEZCYVVJc1EwRkJReXhKUVVGRUxFVkJRVlU3UVVGRGFFTXNTMEZCU1N4WFFVRlhMRlZCUVZVc2FVSkJRVllzUjBGQk9FSXNhMEpCUVRkRE8wRkJRMEVzUzBGQlNTeGxRVUZsTEVOQlFVTXNUMEZCUkN4SFFVRlhMR2xDUVVGWUxFZEJRU3RDTEd0Q1FVRnNSRHRCUVVOQkxFdEJRVWtzVjBGQlZ5eE5RVUZOTEVsQlFVNHNRMEZCVnl4VFFVRlRMR2RDUVVGVUxFTkJRVEJDTEZGQlFURkNMRU5CUVZnc1EwRkJaanM3UVVGRlFTeGpRVUZoTEZsQlFXSTdPMEZCUlVFc1VVRkJUeXhUUVVGVExFbEJRVlFzUTBGQll5eHBRa0ZCVXp0QlFVTTNRaXhOUVVGSkxFOUJRVThzVFVGQlRTeHJRa0ZCYWtJN1FVRkRRU3hUUVVGUExFdEJRVXNzVTBGQlRDeERRVUZsTEVOQlFXWXNUVUZCYzBJc1NVRkJkRUlzU1VGQk9FSXNTMEZCU3l4VFFVRk1MRU5CUVdVc1EwRkJaaXhOUVVGelFpeExRVUZMTEZkQlFVd3NSVUZCTTBRN1FVRkRRU3hGUVVoTkxFTkJRVkE3UVVGSlFTeERRVmhFT3p0QlFXTkJMRWxCUVUwc1pVRkJaU3hUUVVGbUxGbEJRV1VzUjBGQlRUdEJRVU14UWl4TFFVRk5MSFZDUVVGMVFpeFRRVUYyUWl4dlFrRkJkVUlzUTBGQlF5eFBRVUZFTEVWQlFWVXNUVUZCVml4RlFVRnhRanRCUVVOcVJDeFZRVUZSTEdkQ1FVRlNMRU5CUVhsQ0xFOUJRWHBDTEVWQlFXdERMRmxCUVUwN1FVRkRka01zVDBGQlRTeGhRVUZoTEZOQlFWTXNZMEZCVkN4RFFVRjNRaXhOUVVGNFFpeERRVUZ1UWp0QlFVTkJMRTlCUVVrc1pVRkJTanM3UVVGRlFTeFBRVUZKTEVOQlFVTXNUMEZCVEN4RlFVRmpPMEZCUTJJc1lVRkJVeXhYUVVGWExFZEJRVmdzUjBGQmFVSXNVMEZCVXl4alFVRlVMRU5CUVhkQ0xHVkJRWGhDTEVOQlFXcENMRWRCUVRSRUxGZEJRVmNzWVVGQldDeERRVUY1UWl4aFFVRjZRaXhEUVVGMVF5eGhRVUYyUXl4RFFVRnhSQ3hoUVVGeVJDeERRVUZ0UlN4elFrRkJia1VzUTBGQk1FWXNZVUZCTVVZc1EwRkJkMGNzTWtKQlFYaEhMRU5CUVhKRk8wRkJRMEVzU1VGR1JDeE5RVVZQTzBGQlEwNHNZVUZCVXl4WFFVRlhMRWRCUVZnc1IwRkJhVUlzVTBGQlV5eGpRVUZVTEVOQlFYZENMR1ZCUVhoQ0xFTkJRV3BDTEVkQlFUUkVMRmRCUVZjc1lVRkJXQ3hEUVVGNVFpeGhRVUY2UWl4RFFVRjFReXhoUVVGMlF5eERRVUZ4UkN4elFrRkJja1FzUTBGQk5FVXNZVUZCTlVVc1EwRkJNRVlzTWtKQlFURkdMRU5CUVhKRk8wRkJRMEU3TzBGQlJVUXNWVUZCVHl4alFVRlFMRU5CUVhOQ0xFVkJRVU1zVlVGQlZTeFJRVUZZTEVWQlFYRkNMRTlCUVU4c1QwRkJOVUlzUlVGQmRFSTdRVUZEUVN4SFFWaEVPMEZCV1VFc1JVRmlSRHM3UVVGbFFTeExRVUZKTEdkQ1FVRm5RaXhGUVVGd1FqdEJRVU5CTEV0QlFVa3NVMEZCVXl4VFFVRlRMR0ZCUVZRc1EwRkJkVUlzYjBKQlFYWkNMRU5CUVdJN1FVRkRRU3hSUVVGUExGTkJRVkFzUjBGQmJVSXNSVUZCYmtJN08wRkJSVUVzY1VKQlFWTXNUMEZCVkN4RFFVRnBRaXhyUWtGQlZUdEJRVU14UWl4TlFVRkpMR05CUVdNc1pVRkJaU3hOUVVGbUxFTkJRV3hDTzBGQlEwRXNUVUZCU1N4VlFVRlZMRk5CUVZNc1lVRkJWQ3hEUVVGMVFpeEhRVUYyUWl4RFFVRmtPenRCUVVWQkxFMUJRVWtzUTBGQlF5eFhRVUZNTEVWQlFXdENPenRCUVVWc1FpeGpRVUZaTEVWQlFWb3NSMEZCYVVJc1RVRkJha0k3UVVGRFFTeFZRVUZSTEZOQlFWSXNSMEZCYjBJc1QwRkJUeXhYUVVGUUxFVkJRWEJDTzBGQlEwRXNWVUZCVVN4VFFVRlNMRWRCUVc5Q0xIbENRVUZ3UWpzN1FVRkZRU3gxUWtGQmNVSXNUMEZCY2tJc1JVRkJPRUlzVFVGQk9VSTdRVUZEUVN4VFFVRlBMRmRCUVZBc1EwRkJiVUlzVDBGQmJrSTdRVUZEUVN4RlFWcEVPMEZCWVVFc1EwRnFRMFE3TzBGQmJVTkJMRWxCUVUwc1pVRkJaU3hUUVVGbUxGbEJRV1VzUTBGQlF5eE5RVUZFTEVWQlFWTXNUMEZCVkN4RlFVRnhRanRCUVVONlF5eFJRVUZQTEU5QlFWQXNRMEZCWlN4cFFrRkJVenRCUVVOMlFpeE5RVUZOTEN0Q1FVRTJRaXhMUVVGdVF6dEJRVU5CTEUxQlFVMHNXVUZCV1N4VFFVRlRMR0ZCUVZRc1EwRkJkVUlzUzBGQmRrSXNRMEZCYkVJN1FVRkRRU3hOUVVGTkxFOUJRVThzVTBGQlV5eGhRVUZVTEVOQlFYVkNMRXRCUVhaQ0xFTkJRV0k3UVVGRFFTeFBRVUZMTEZOQlFVd3NSMEZCYVVJc1pVRkJha0k3UVVGRFFTeFBRVUZMTEVkQlFVd3NSMEZCVnl4SFFVRllPMEZCUTBFc1dVRkJWU3hYUVVGV0xFTkJRWE5DTEVsQlFYUkNPMEZCUTBFc1ZVRkJVU3hYUVVGU0xFTkJRVzlDTEZOQlFYQkNPMEZCUTBFc1JVRlNSRHRCUVZOQkxFTkJWa1E3TzBGQldVRXNTVUZCVFN4blFrRkJaMElzVTBGQmFFSXNZVUZCWjBJc1IwRkJUVHRCUVVNelFpeExRVUZOTEdWQlFXVXNVMEZCVXl4alFVRlVMRU5CUVhkQ0xGTkJRWGhDTEVOQlFYSkNPMEZCUTBFc1MwRkJUU3hqUVVGakxGVkJRVlVzVVVGQlVTeFBRVUZzUWl4SFFVRTBRaXhSUVVGUkxGRkJRWGhFT3p0QlFVVkJMR05CUVdFc1UwRkJZaXhIUVVGNVFpeEZRVUY2UWpzN1FVRkZRU3hoUVVGWkxFOUJRVm9zUTBGQmIwSXNhVUpCUVZNN1FVRkJRU3hOUVVOd1FpeExRVVJ2UWl4SFFVTjNReXhMUVVSNFF5eERRVU53UWl4TFFVUnZRanRCUVVGQkxFMUJRMklzVVVGRVlTeEhRVU4zUXl4TFFVUjRReXhEUVVOaUxGRkJSR0U3UVVGQlFTeE5RVU5JTEZOQlJFY3NSMEZEZDBNc1MwRkVlRU1zUTBGRFNDeFRRVVJITzBGQlFVRXNUVUZEVVN4TlFVUlNMRWRCUTNkRExFdEJSSGhETEVOQlExRXNUVUZFVWp0QlFVRkJMRTFCUTJkQ0xGZEJSR2hDTEVkQlEzZERMRXRCUkhoRExFTkJRMmRDTEZkQlJHaENPMEZCUVVFc1RVRkROa0lzVFVGRU4wSXNSMEZEZDBNc1MwRkVlRU1zUTBGRE5rSXNUVUZFTjBJN096dEJRVWMxUWl4bFFVRmhMR3RDUVVGaUxFTkJRV2RETEZkQlFXaERMRVZCUVRaRExEQkNRVUUzUXpzN1FVRkZRU3hOUVVGTkxHTkJRV01zVTBGQlV5eG5Ra0ZCVkN4RFFVRXdRaXgzUWtGQk1VSXNRMEZCY0VJN1FVRkRRU3hOUVVGTkxGVkJRVlVzV1VGQldTeFpRVUZaTEUxQlFWb3NSMEZCY1VJc1EwRkJha01zUTBGQmFFSTdRVUZEUVRzN1FVRkZRU3hOUVVGSkxFOUJRVThzVFVGQldDeEZRVUZ0UWl4aFFVRmhMRTFCUVdJc1JVRkJjVUlzVDBGQmNrSTdPMEZCUlc1Q0xFMUJRVTBzYjBKQlFXOUNMRk5CUVZNc1lVRkJWQ3hEUVVGMVFpeExRVUYyUWl4RFFVRXhRanRCUVVOQkxFMUJRVTBzYlVKQlFXMUNMRk5CUVZNc1lVRkJWQ3hEUVVGMVFpeEhRVUYyUWl4RFFVRjZRanRCUVVOQkxFMUJRVTBzWTBGQll5eFRRVUZUTEdGQlFWUXNRMEZCZFVJc1IwRkJka0lzUTBGQmNFSTdRVUZEUVN4dlFrRkJhMElzVTBGQmJFSXNRMEZCTkVJc1IwRkJOVUlzUTBGQlowTXNORUpCUVdoRE8wRkJRMEVzYlVKQlFXbENMRk5CUVdwQ0xFTkJRVEpDTEVkQlFUTkNMRU5CUVN0Q0xIRkNRVUV2UWp0QlFVTkJMR05CUVZrc1UwRkJXaXhEUVVGelFpeEhRVUYwUWl4RFFVRXdRaXhuUWtGQk1VSTdPMEZCUlVFc2JVSkJRV2xDTEZOQlFXcENMRWRCUVRaQ0xGZEJRVGRDTzBGQlEwRXNZMEZCV1N4VFFVRmFMRWRCUVhkQ0xFMUJRWGhDT3p0QlFVVkJMRzlDUVVGclFpeFhRVUZzUWl4RFFVRTRRaXhuUWtGQk9VSXNSVUZCWjBRc1YwRkJhRVE3UVVGRFFTeFZRVUZSTEZkQlFWSXNRMEZCYjBJc2FVSkJRWEJDT3p0QlFVVkJMRTFCUVUwc1kwRkJZeXhUUVVGVExHZENRVUZVTEVOQlFUQkNMSGxDUVVFeFFpeERRVUZ3UWp0QlFVTkJMRTFCUVUwc1UwRkJVeXhaUVVGWkxGbEJRVmtzVFVGQldpeEhRVUZ4UWl4RFFVRnFReXhEUVVGbU96dEJRVVZCTEUxQlFVMHNZMEZCWXl4VFFVRlRMR2RDUVVGVUxFTkJRVEJDTEN0Q1FVRXhRaXhEUVVGd1FqdEJRVU5CTEUxQlFVMHNVMEZCVXl4WlFVRlpMRmxCUVZrc1RVRkJXaXhIUVVGeFFpeERRVUZxUXl4RFFVRm1PenRCUVVWQkxFMUJRVTBzWVVGQllTeFRRVUZUTEdkQ1FVRlVMRU5CUVRCQ0xEaENRVUV4UWl4RFFVRnVRanRCUVVOQkxFMUJRVTBzVVVGQlVTeFhRVUZYTEZkQlFWY3NUVUZCV0N4SFFVRnZRaXhEUVVFdlFpeERRVUZrT3p0QlFVVkJMRk5CUVU4c1UwRkJVQ3hIUVVGdFFpeExRVUZ1UWp0QlFVTkJMRk5CUVU4c1UwRkJVQ3hIUVVGdFFpeFRRVUZ1UWp0QlFVTkJMRkZCUVUwc1UwRkJUaXhIUVVGclFpeFJRVUZzUWpzN1FVRkZRU3hOUVVGTkxHRkJRV0VzVVVGQlVTeGhRVUZTTEVOQlFYTkNMR0ZCUVhSQ0xFTkJRVzlETEdGQlFYQkRMRU5CUVc1Q08wRkJRMEVzVFVGQlRTeGhRVUZoTEZGQlFWRXNZVUZCVWl4RFFVRnpRaXhoUVVGMFFpeERRVUZ2UXl4aFFVRndReXhEUVVGdVFqczdRVUZGUVN4TlFVRkpMRlZCUVZVc1VVRkJVU3hwUWtGQmRFSTdRVUZEUVN4aFFVRlhMR2RDUVVGWUxFTkJRVFJDTEU5QlFUVkNMRVZCUVhGRExGbEJRVTA3UVVGRE1VTXNUMEZCVFN4UFFVRlBMRkZCUVZFc2EwSkJRWEpDTzBGQlEwRXNUMEZCU1N4SlFVRktMRVZCUVZVN1FVRkRWQ3hUUVVGTExHTkJRVXdzUTBGQmIwSXNSVUZCUXl4VlFVRlZMRkZCUVZnc1JVRkJjVUlzVDBGQlR5eFRRVUUxUWl4RlFVRjFReXhSUVVGUkxGRkJRUzlETEVWQlFYQkNPMEZCUTBFc1kwRkJWU3hKUVVGV08wRkJRMEU3UVVGRFJDeEhRVTVFT3p0QlFWRkJMR0ZCUVZjc1owSkJRVmdzUTBGQk5FSXNUMEZCTlVJc1JVRkJjVU1zV1VGQlRUdEJRVU14UXl4UFFVRk5MRTlCUVU4c1VVRkJVU3h6UWtGQmNrSTdRVUZEUVN4UFFVRkpMRWxCUVVvc1JVRkJWVHRCUVVOVUxGTkJRVXNzWTBGQlRDeERRVUZ2UWl4RlFVRkRMRlZCUVZVc1VVRkJXQ3hGUVVGeFFpeFBRVUZQTEZOQlFUVkNMRVZCUVhWRExGRkJRVkVzVVVGQkwwTXNSVUZCY0VJN1FVRkRRU3hqUVVGVkxFbEJRVlk3UVVGRFFUdEJRVU5FTEVkQlRrUTdRVUZQUVN4RlFYaEVSRHM3UVVFd1JFRTdRVUZEUVR0QlFVTkJMRU5CYkVWRU96dEJRVzlGUVR0QlFVTkJMRWxCUVUwc1kwRkJZeXhUUVVGa0xGZEJRV01zUjBGQlRUdEJRVU42UWl4VFFVRlJMRTlCUVZJc1EwRkJaMElzU1VGQmFFSXNRMEZCY1VJc1ZVRkJReXhEUVVGRUxFVkJRVWtzUTBGQlNpeEZRVUZWTzBGQlF6bENMRTFCUVVrc1UwRkJVeXhGUVVGRkxFdEJRVVlzUTBGQlVTeERRVUZTTEVWQlFWY3NWMEZCV0N4RlFVRmlPMEZCUTBFc1RVRkJTU3hUUVVGVExFVkJRVVVzUzBGQlJpeERRVUZSTEVOQlFWSXNSVUZCVnl4WFFVRllMRVZCUVdJN1FVRkRRU3hOUVVGSkxGTkJRVk1zVFVGQllpeEZRVUZ4UWl4UFFVRlBMRU5CUVZBc1EwRkJja0lzUzBGRFN5eEpRVUZKTEZOQlFWTXNUVUZCWWl4RlFVRnhRaXhQUVVGUExFTkJRVU1zUTBGQlVpeERRVUZ5UWl4TFFVTkJMRTlCUVU4c1EwRkJVRHRCUVVOTUxFVkJUa1E3UVVGUFFTeERRVkpFT3p0QlFWVkJMRWxCUVUwc1ZVRkJWU3hUUVVGV0xFOUJRVlVzUTBGQlF5eEpRVUZFTEVWQlFWVTdRVUZEZWtJc1UwRkJVU3hSUVVGU0xFZEJRVzFDTEVsQlFXNUNPMEZCUTBFc1UwRkJVU3hQUVVGU0xFZEJRV3RDTEV0QlFVc3NTMEZCVEN4RlFVRnNRaXhEUVVaNVFpeERRVVZQT3p0QlFVVm9RenRCUVVOQk8wRkJRMEVzUTBGT1JEczdRVUZSUVN4SlFVRk5MRmxCUVZrc1UwRkJXaXhUUVVGWkxFZEJRVTA3UVVGRGRrSXNUMEZCVFN4aFFVRk9MRVZCUVZVc1NVRkJWaXhEUVVGbE8wRkJRVUVzVTBGQlR5eEpRVUZKTEVsQlFVb3NSVUZCVUR0QlFVRkJMRVZCUVdZc1JVRkRReXhKUVVSRUxFTkJRMDBzWjBKQlFWRTdRVUZEWWl4VlFVRlJMRWxCUVZJN1FVRkRRVHRCUVVOQkxFVkJTa1FzUlVGTFF5eExRVXhFTEVOQlMwODdRVUZCUVN4VFFVRlBMRkZCUVZFc1NVRkJVaXhEUVVGaExFZEJRV0lzUTBGQlVEdEJRVUZCTEVWQlRGQTdRVUZOUVN4RFFWQkVPenRCUVZOQkxFbEJRVTBzVDBGQlR5eFRRVUZRTEVsQlFVOHNSMEZCVFR0QlFVTnNRaXhuUTBGQllTeFJRVUZpTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQkxFTkJVRVE3TzBGQlUwRTdPenM3T3pzN08wRkRPVkpCTEVsQlFVMHNPREJDUVVGT096dHJRa0YxUW1Vc1pUczdPenM3T3pzN096dEJRM1pDWmpzN096dEJRVU5CT3pzN096czdVVUZGVXl4bExFZEJRVUVzYVVJN1VVRkJhVUlzU3l4SFFVRkJMR1U3T3pzN096czdPMEZEU0RGQ0xFbEJRVTBzYlcxQ1FVRk9PenRCUVdsQ1FTeEpRVUZOTEZGQlFWRXNVMEZCVWl4TFFVRlJMRWRCUVUwN1FVRkRia0lzUzBGQlNTeFhRVUZYTEZOQlFWTXNZMEZCVkN4RFFVRjNRaXhSUVVGNFFpeERRVUZtTzBGQlEwRXNWVUZCVXl4VFFVRlVMRWRCUVhGQ0xGRkJRWEpDTzBGQlEwRXNRMEZJUkRzN2EwSkJTMlVzU3pzN096czdPenM3T3p0QlEzUkNaanM3UVVGRlFTeEpRVUZOTEZkQlFWY3NVMEZCV0N4UlFVRlhMRU5CUVVNc1JVRkJSQ3hGUVVGTExFbEJRVXdzUlVGQll6dEJRVU0zUWl4TlFVRkpMR2RDUVVGS096dEJRVVZCTEZOQlFVOHNXVUZCVnp0QlFVRkJPMEZCUVVFN08wRkJRMmhDTEZGQlFVMHNaVUZCWlN4VFFVRm1MRmxCUVdVN1FVRkJRU3hoUVVGTkxFZEJRVWNzUzBGQlNDeERRVUZUTEV0QlFWUXNSVUZCWlN4VlFVRm1MRU5CUVU0N1FVRkJRU3hMUVVGeVFqczdRVUZGUVN4cFFrRkJZU3hQUVVGaU8wRkJRMEVzWTBGQlZTeFhRVUZYTEZsQlFWZ3NSVUZCZVVJc1NVRkJla0lzUTBGQlZqdEJRVU5FTEVkQlRFUTdRVUZOUkN4RFFWUkVPenRCUVZkQkxFbEJRVTBzWTBGQll5eFRRVUZrTEZkQlFXTXNSMEZCVFR0QlFVTjZRaXh6UWtGQlV5eFBRVUZVTEVOQlFXbENMR2RDUVVGUk8wRkJRM2hDTEZOQlFVc3NVMEZCVEN4RFFVRmxMRTFCUVdZc1EwRkJjMElzVTBGQmRFSTdRVUZEUVN4VFFVRkxMRk5CUVV3c1EwRkJaU3hIUVVGbUxFTkJRVzFDTEU5QlFXNUNPMEZCUTBFc1IwRklSRHRCUVVsQkxHdENRVUZMTEZOQlFVd3NRMEZCWlN4SFFVRm1MRU5CUVcxQ0xFOUJRVzVDTzBGQlEwRXNRMEZPUkRzN1VVRlJVeXhSTEVkQlFVRXNVVHRSUVVGVkxGY3NSMEZCUVN4WElpd2labWxzWlNJNkltZGxibVZ5WVhSbFpDNXFjeUlzSW5OdmRYSmpaVkp2YjNRaU9pSWlMQ0p6YjNWeVkyVnpRMjl1ZEdWdWRDSTZXeUlvWm5WdVkzUnBiMjRvS1h0bWRXNWpkR2x2YmlCeUtHVXNiaXgwS1h0bWRXNWpkR2x2YmlCdktHa3NaaWw3YVdZb0lXNWJhVjBwZTJsbUtDRmxXMmxkS1h0MllYSWdZejFjSW1aMWJtTjBhVzl1WENJOVBYUjVjR1Z2WmlCeVpYRjFhWEpsSmlaeVpYRjFhWEpsTzJsbUtDRm1KaVpqS1hKbGRIVnliaUJqS0drc0lUQXBPMmxtS0hVcGNtVjBkWEp1SUhVb2FTd2hNQ2s3ZG1GeUlHRTlibVYzSUVWeWNtOXlLRndpUTJGdWJtOTBJR1pwYm1RZ2JXOWtkV3hsSUNkY0lpdHBLMXdpSjF3aUtUdDBhSEp2ZHlCaExtTnZaR1U5WENKTlQwUlZURVZmVGs5VVgwWlBWVTVFWENJc1lYMTJZWElnY0QxdVcybGRQWHRsZUhCdmNuUnpPbnQ5ZlR0bFcybGRXekJkTG1OaGJHd29jQzVsZUhCdmNuUnpMR1oxYm1OMGFXOXVLSElwZTNaaGNpQnVQV1ZiYVYxYk1WMWJjbDA3Y21WMGRYSnVJRzhvYm54OGNpbDlMSEFzY0M1bGVIQnZjblJ6TEhJc1pTeHVMSFFwZlhKbGRIVnliaUJ1VzJsZExtVjRjRzl5ZEhOOVptOXlLSFpoY2lCMVBWd2lablZ1WTNScGIyNWNJajA5ZEhsd1pXOW1JSEpsY1hWcGNtVW1KbkpsY1hWcGNtVXNhVDB3TzJrOGRDNXNaVzVuZEdnN2FTc3JLVzhvZEZ0cFhTazdjbVYwZFhKdUlHOTljbVYwZFhKdUlISjlLU2dwSWl3aUx5b2djMjF2YjNSb2MyTnliMnhzSUhZd0xqUXVNQ0F0SURJd01UZ2dMU0JFZFhOMFlXNGdTMkZ6ZEdWdUxDQktaWEpsYldsaGN5Qk5aVzVwWTJobGJHeHBJQzBnVFVsVUlFeHBZMlZ1YzJVZ0tpOWNiaWhtZFc1amRHbHZiaUFvS1NCN1hHNGdJQ2QxYzJVZ2MzUnlhV04wSnp0Y2JseHVJQ0F2THlCd2IyeDVabWxzYkZ4dUlDQm1kVzVqZEdsdmJpQndiMng1Wm1sc2JDZ3BJSHRjYmlBZ0lDQXZMeUJoYkdsaGMyVnpYRzRnSUNBZ2RtRnlJSGNnUFNCM2FXNWtiM2M3WEc0Z0lDQWdkbUZ5SUdRZ1BTQmtiMk4xYldWdWREdGNibHh1SUNBZ0lDOHZJSEpsZEhWeWJpQnBaaUJ6WTNKdmJHd2dZbVZvWVhacGIzSWdhWE1nYzNWd2NHOXlkR1ZrSUdGdVpDQndiMng1Wm1sc2JDQnBjeUJ1YjNRZ1ptOXlZMlZrWEc0Z0lDQWdhV1lnS0Z4dUlDQWdJQ0FnSjNOamNtOXNiRUpsYUdGMmFXOXlKeUJwYmlCa0xtUnZZM1Z0Wlc1MFJXeGxiV1Z1ZEM1emRIbHNaU0FtSmx4dUlDQWdJQ0FnZHk1ZlgyWnZjbU5sVTIxdmIzUm9VMk55YjJ4c1VHOXNlV1pwYkd4Zlh5QWhQVDBnZEhKMVpWeHVJQ0FnSUNrZ2UxeHVJQ0FnSUNBZ2NtVjBkWEp1TzF4dUlDQWdJSDFjYmx4dUlDQWdJQzh2SUdkc2IySmhiSE5jYmlBZ0lDQjJZWElnUld4bGJXVnVkQ0E5SUhjdVNGUk5URVZzWlcxbGJuUWdmSHdnZHk1RmJHVnRaVzUwTzF4dUlDQWdJSFpoY2lCVFExSlBURXhmVkVsTlJTQTlJRFEyT0R0Y2JseHVJQ0FnSUM4dklHOWlhbVZqZENCbllYUm9aWEpwYm1jZ2IzSnBaMmx1WVd3Z2MyTnliMnhzSUcxbGRHaHZaSE5jYmlBZ0lDQjJZWElnYjNKcFoybHVZV3dnUFNCN1hHNGdJQ0FnSUNCelkzSnZiR3c2SUhjdWMyTnliMnhzSUh4OElIY3VjMk55YjJ4c1ZHOHNYRzRnSUNBZ0lDQnpZM0p2Ykd4Q2VUb2dkeTV6WTNKdmJHeENlU3hjYmlBZ0lDQWdJR1ZzWlcxbGJuUlRZM0p2Ykd3NklFVnNaVzFsYm5RdWNISnZkRzkwZVhCbExuTmpjbTlzYkNCOGZDQnpZM0p2Ykd4RmJHVnRaVzUwTEZ4dUlDQWdJQ0FnYzJOeWIyeHNTVzUwYjFacFpYYzZJRVZzWlcxbGJuUXVjSEp2ZEc5MGVYQmxMbk5qY205c2JFbHVkRzlXYVdWM1hHNGdJQ0FnZlR0Y2JseHVJQ0FnSUM4dklHUmxabWx1WlNCMGFXMXBibWNnYldWMGFHOWtYRzRnSUNBZ2RtRnlJRzV2ZHlBOVhHNGdJQ0FnSUNCM0xuQmxjbVp2Y20xaGJtTmxJQ1ltSUhjdWNHVnlabTl5YldGdVkyVXVibTkzWEc0Z0lDQWdJQ0FnSUQ4Z2R5NXdaWEptYjNKdFlXNWpaUzV1YjNjdVltbHVaQ2gzTG5CbGNtWnZjbTFoYm1ObEtWeHVJQ0FnSUNBZ0lDQTZJRVJoZEdVdWJtOTNPMXh1WEc0Z0lDQWdMeW9xWEc0Z0lDQWdJQ29nYVc1a2FXTmhkR1Z6SUdsbUlHRWdkR2hsSUdOMWNuSmxiblFnWW5KdmQzTmxjaUJwY3lCdFlXUmxJR0o1SUUxcFkzSnZjMjltZEZ4dUlDQWdJQ0FxSUVCdFpYUm9iMlFnYVhOTmFXTnliM052Wm5SQ2NtOTNjMlZ5WEc0Z0lDQWdJQ29nUUhCaGNtRnRJSHRUZEhKcGJtZDlJSFZ6WlhKQloyVnVkRnh1SUNBZ0lDQXFJRUJ5WlhSMWNtNXpJSHRDYjI5c1pXRnVmVnh1SUNBZ0lDQXFMMXh1SUNBZ0lHWjFibU4wYVc5dUlHbHpUV2xqY205emIyWjBRbkp2ZDNObGNpaDFjMlZ5UVdkbGJuUXBJSHRjYmlBZ0lDQWdJSFpoY2lCMWMyVnlRV2RsYm5SUVlYUjBaWEp1Y3lBOUlGc25UVk5KUlNBbkxDQW5WSEpwWkdWdWRDOG5MQ0FuUldSblpTOG5YVHRjYmx4dUlDQWdJQ0FnY21WMGRYSnVJRzVsZHlCU1pXZEZlSEFvZFhObGNrRm5aVzUwVUdGMGRHVnlibk11YW05cGJpZ25mQ2NwS1M1MFpYTjBLSFZ6WlhKQloyVnVkQ2s3WEc0Z0lDQWdmVnh1WEc0Z0lDQWdMeXBjYmlBZ0lDQWdLaUJKUlNCb1lYTWdjbTkxYm1ScGJtY2dZblZuSUhKdmRXNWthVzVuSUdSdmQyNGdZMnhwWlc1MFNHVnBaMmgwSUdGdVpDQmpiR2xsYm5SWGFXUjBhQ0JoYm1SY2JpQWdJQ0FnS2lCeWIzVnVaR2x1WnlCMWNDQnpZM0p2Ykd4SVpXbG5hSFFnWVc1a0lITmpjbTlzYkZkcFpIUm9JR05oZFhOcGJtY2dabUZzYzJVZ2NHOXphWFJwZG1WelhHNGdJQ0FnSUNvZ2IyNGdhR0Z6VTJOeWIyeHNZV0pzWlZOd1lXTmxYRzRnSUNBZ0lDb3ZYRzRnSUNBZ2RtRnlJRkpQVlU1RVNVNUhYMVJQVEVWU1FVNURSU0E5SUdselRXbGpjbTl6YjJaMFFuSnZkM05sY2loM0xtNWhkbWxuWVhSdmNpNTFjMlZ5UVdkbGJuUXBJRDhnTVNBNklEQTdYRzVjYmlBZ0lDQXZLaXBjYmlBZ0lDQWdLaUJqYUdGdVoyVnpJSE5qY205c2JDQndiM05wZEdsdmJpQnBibk5wWkdVZ1lXNGdaV3hsYldWdWRGeHVJQ0FnSUNBcUlFQnRaWFJvYjJRZ2MyTnliMnhzUld4bGJXVnVkRnh1SUNBZ0lDQXFJRUJ3WVhKaGJTQjdUblZ0WW1WeWZTQjRYRzRnSUNBZ0lDb2dRSEJoY21GdElIdE9kVzFpWlhKOUlIbGNiaUFnSUNBZ0tpQkFjbVYwZFhKdWN5QjdkVzVrWldacGJtVmtmVnh1SUNBZ0lDQXFMMXh1SUNBZ0lHWjFibU4wYVc5dUlITmpjbTlzYkVWc1pXMWxiblFvZUN3Z2VTa2dlMXh1SUNBZ0lDQWdkR2hwY3k1elkzSnZiR3hNWldaMElEMGdlRHRjYmlBZ0lDQWdJSFJvYVhNdWMyTnliMnhzVkc5d0lEMGdlVHRjYmlBZ0lDQjlYRzVjYmlBZ0lDQXZLaXBjYmlBZ0lDQWdLaUJ5WlhSMWNtNXpJSEpsYzNWc2RDQnZaaUJoY0hCc2VXbHVaeUJsWVhObElHMWhkR2dnWm5WdVkzUnBiMjRnZEc4Z1lTQnVkVzFpWlhKY2JpQWdJQ0FnS2lCQWJXVjBhRzlrSUdWaGMyVmNiaUFnSUNBZ0tpQkFjR0Z5WVcwZ2UwNTFiV0psY24wZ2ExeHVJQ0FnSUNBcUlFQnlaWFIxY201eklIdE9kVzFpWlhKOVhHNGdJQ0FnSUNvdlhHNGdJQ0FnWm5WdVkzUnBiMjRnWldGelpTaHJLU0I3WEc0Z0lDQWdJQ0J5WlhSMWNtNGdNQzQxSUNvZ0tERWdMU0JOWVhSb0xtTnZjeWhOWVhSb0xsQkpJQ29nYXlrcE8xeHVJQ0FnSUgxY2JseHVJQ0FnSUM4cUtseHVJQ0FnSUNBcUlHbHVaR2xqWVhSbGN5QnBaaUJoSUhOdGIyOTBhQ0JpWldoaGRtbHZjaUJ6YUc5MWJHUWdZbVVnWVhCd2JHbGxaRnh1SUNBZ0lDQXFJRUJ0WlhSb2IyUWdjMmh2ZFd4a1FtRnBiRTkxZEZ4dUlDQWdJQ0FxSUVCd1lYSmhiU0I3VG5WdFltVnlmRTlpYW1WamRIMGdabWx5YzNSQmNtZGNiaUFnSUNBZ0tpQkFjbVYwZFhKdWN5QjdRbTl2YkdWaGJuMWNiaUFnSUNBZ0tpOWNiaUFnSUNCbWRXNWpkR2x2YmlCemFHOTFiR1JDWVdsc1QzVjBLR1pwY25OMFFYSm5LU0I3WEc0Z0lDQWdJQ0JwWmlBb1hHNGdJQ0FnSUNBZ0lHWnBjbk4wUVhKbklEMDlQU0J1ZFd4c0lIeDhYRzRnSUNBZ0lDQWdJSFI1Y0dWdlppQm1hWEp6ZEVGeVp5QWhQVDBnSjI5aWFtVmpkQ2NnZkh4Y2JpQWdJQ0FnSUNBZ1ptbHljM1JCY21jdVltVm9ZWFpwYjNJZ1BUMDlJSFZ1WkdWbWFXNWxaQ0I4ZkZ4dUlDQWdJQ0FnSUNCbWFYSnpkRUZ5Wnk1aVpXaGhkbWx2Y2lBOVBUMGdKMkYxZEc4bklIeDhYRzRnSUNBZ0lDQWdJR1pwY25OMFFYSm5MbUpsYUdGMmFXOXlJRDA5UFNBbmFXNXpkR0Z1ZENkY2JpQWdJQ0FnSUNrZ2UxeHVJQ0FnSUNBZ0lDQXZMeUJtYVhKemRDQmhjbWQxYldWdWRDQnBjeUJ1YjNRZ1lXNGdiMkpxWldOMEwyNTFiR3hjYmlBZ0lDQWdJQ0FnTHk4Z2IzSWdZbVZvWVhacGIzSWdhWE1nWVhWMGJ5d2dhVzV6ZEdGdWRDQnZjaUIxYm1SbFptbHVaV1JjYmlBZ0lDQWdJQ0FnY21WMGRYSnVJSFJ5ZFdVN1hHNGdJQ0FnSUNCOVhHNWNiaUFnSUNBZ0lHbG1JQ2gwZVhCbGIyWWdabWx5YzNSQmNtY2dQVDA5SUNkdlltcGxZM1FuSUNZbUlHWnBjbk4wUVhKbkxtSmxhR0YyYVc5eUlEMDlQU0FuYzIxdmIzUm9KeWtnZTF4dUlDQWdJQ0FnSUNBdkx5Qm1hWEp6ZENCaGNtZDFiV1Z1ZENCcGN5QmhiaUJ2WW1wbFkzUWdZVzVrSUdKbGFHRjJhVzl5SUdseklITnRiMjkwYUZ4dUlDQWdJQ0FnSUNCeVpYUjFjbTRnWm1Gc2MyVTdYRzRnSUNBZ0lDQjlYRzVjYmlBZ0lDQWdJQzh2SUhSb2NtOTNJR1Z5Y205eUlIZG9aVzRnWW1Wb1lYWnBiM0lnYVhNZ2JtOTBJSE4xY0hCdmNuUmxaRnh1SUNBZ0lDQWdkR2h5YjNjZ2JtVjNJRlI1Y0dWRmNuSnZjaWhjYmlBZ0lDQWdJQ0FnSjJKbGFHRjJhVzl5SUcxbGJXSmxjaUJ2WmlCVFkzSnZiR3hQY0hScGIyNXpJQ2NnSzF4dUlDQWdJQ0FnSUNBZ0lHWnBjbk4wUVhKbkxtSmxhR0YyYVc5eUlDdGNiaUFnSUNBZ0lDQWdJQ0FuSUdseklHNXZkQ0JoSUhaaGJHbGtJSFpoYkhWbElHWnZjaUJsYm5WdFpYSmhkR2x2YmlCVFkzSnZiR3hDWldoaGRtbHZjaTRuWEc0Z0lDQWdJQ0FwTzF4dUlDQWdJSDFjYmx4dUlDQWdJQzhxS2x4dUlDQWdJQ0FxSUdsdVpHbGpZWFJsY3lCcFppQmhiaUJsYkdWdFpXNTBJR2hoY3lCelkzSnZiR3hoWW14bElITndZV05sSUdsdUlIUm9aU0J3Y205MmFXUmxaQ0JoZUdselhHNGdJQ0FnSUNvZ1FHMWxkR2h2WkNCb1lYTlRZM0p2Ykd4aFlteGxVM0JoWTJWY2JpQWdJQ0FnS2lCQWNHRnlZVzBnZTA1dlpHVjlJR1ZzWEc0Z0lDQWdJQ29nUUhCaGNtRnRJSHRUZEhKcGJtZDlJR0Y0YVhOY2JpQWdJQ0FnS2lCQWNtVjBkWEp1Y3lCN1FtOXZiR1ZoYm4xY2JpQWdJQ0FnS2k5Y2JpQWdJQ0JtZFc1amRHbHZiaUJvWVhOVFkzSnZiR3hoWW14bFUzQmhZMlVvWld3c0lHRjRhWE1wSUh0Y2JpQWdJQ0FnSUdsbUlDaGhlR2x6SUQwOVBTQW5XU2NwSUh0Y2JpQWdJQ0FnSUNBZ2NtVjBkWEp1SUdWc0xtTnNhV1Z1ZEVobGFXZG9kQ0FySUZKUFZVNUVTVTVIWDFSUFRFVlNRVTVEUlNBOElHVnNMbk5qY205c2JFaGxhV2RvZER0Y2JpQWdJQ0FnSUgxY2JseHVJQ0FnSUNBZ2FXWWdLR0Y0YVhNZ1BUMDlJQ2RZSnlrZ2UxeHVJQ0FnSUNBZ0lDQnlaWFIxY200Z1pXd3VZMnhwWlc1MFYybGtkR2dnS3lCU1QxVk9SRWxPUjE5VVQweEZVa0ZPUTBVZ1BDQmxiQzV6WTNKdmJHeFhhV1IwYUR0Y2JpQWdJQ0FnSUgxY2JpQWdJQ0I5WEc1Y2JpQWdJQ0F2S2lwY2JpQWdJQ0FnS2lCcGJtUnBZMkYwWlhNZ2FXWWdZVzRnWld4bGJXVnVkQ0JvWVhNZ1lTQnpZM0p2Ykd4aFlteGxJRzkyWlhKbWJHOTNJSEJ5YjNCbGNuUjVJR2x1SUhSb1pTQmhlR2x6WEc0Z0lDQWdJQ29nUUcxbGRHaHZaQ0JqWVc1UGRtVnlabXh2ZDF4dUlDQWdJQ0FxSUVCd1lYSmhiU0I3VG05a1pYMGdaV3hjYmlBZ0lDQWdLaUJBY0dGeVlXMGdlMU4wY21sdVozMGdZWGhwYzF4dUlDQWdJQ0FxSUVCeVpYUjFjbTV6SUh0Q2IyOXNaV0Z1ZlZ4dUlDQWdJQ0FxTDF4dUlDQWdJR1oxYm1OMGFXOXVJR05oYms5MlpYSm1iRzkzS0dWc0xDQmhlR2x6S1NCN1hHNGdJQ0FnSUNCMllYSWdiM1psY21ac2IzZFdZV3gxWlNBOUlIY3VaMlYwUTI5dGNIVjBaV1JUZEhsc1pTaGxiQ3dnYm5Wc2JDbGJKMjkyWlhKbWJHOTNKeUFySUdGNGFYTmRPMXh1WEc0Z0lDQWdJQ0J5WlhSMWNtNGdiM1psY21ac2IzZFdZV3gxWlNBOVBUMGdKMkYxZEc4bklIeDhJRzkyWlhKbWJHOTNWbUZzZFdVZ1BUMDlJQ2R6WTNKdmJHd25PMXh1SUNBZ0lIMWNibHh1SUNBZ0lDOHFLbHh1SUNBZ0lDQXFJR2x1WkdsallYUmxjeUJwWmlCaGJpQmxiR1Z0Wlc1MElHTmhiaUJpWlNCelkzSnZiR3hsWkNCcGJpQmxhWFJvWlhJZ1lYaHBjMXh1SUNBZ0lDQXFJRUJ0WlhSb2IyUWdhWE5UWTNKdmJHeGhZbXhsWEc0Z0lDQWdJQ29nUUhCaGNtRnRJSHRPYjJSbGZTQmxiRnh1SUNBZ0lDQXFJRUJ3WVhKaGJTQjdVM1J5YVc1bmZTQmhlR2x6WEc0Z0lDQWdJQ29nUUhKbGRIVnlibk1nZTBKdmIyeGxZVzU5WEc0Z0lDQWdJQ292WEc0Z0lDQWdablZ1WTNScGIyNGdhWE5UWTNKdmJHeGhZbXhsS0dWc0tTQjdYRzRnSUNBZ0lDQjJZWElnYVhOVFkzSnZiR3hoWW14bFdTQTlJR2hoYzFOamNtOXNiR0ZpYkdWVGNHRmpaU2hsYkN3Z0oxa25LU0FtSmlCallXNVBkbVZ5Wm14dmR5aGxiQ3dnSjFrbktUdGNiaUFnSUNBZ0lIWmhjaUJwYzFOamNtOXNiR0ZpYkdWWUlEMGdhR0Z6VTJOeWIyeHNZV0pzWlZOd1lXTmxLR1ZzTENBbldDY3BJQ1ltSUdOaGJrOTJaWEptYkc5M0tHVnNMQ0FuV0NjcE8xeHVYRzRnSUNBZ0lDQnlaWFIxY200Z2FYTlRZM0p2Ykd4aFlteGxXU0I4ZkNCcGMxTmpjbTlzYkdGaWJHVllPMXh1SUNBZ0lIMWNibHh1SUNBZ0lDOHFLbHh1SUNBZ0lDQXFJR1pwYm1SeklITmpjbTlzYkdGaWJHVWdjR0Z5Wlc1MElHOW1JR0Z1SUdWc1pXMWxiblJjYmlBZ0lDQWdLaUJBYldWMGFHOWtJR1pwYm1SVFkzSnZiR3hoWW14bFVHRnlaVzUwWEc0Z0lDQWdJQ29nUUhCaGNtRnRJSHRPYjJSbGZTQmxiRnh1SUNBZ0lDQXFJRUJ5WlhSMWNtNXpJSHRPYjJSbGZTQmxiRnh1SUNBZ0lDQXFMMXh1SUNBZ0lHWjFibU4wYVc5dUlHWnBibVJUWTNKdmJHeGhZbXhsVUdGeVpXNTBLR1ZzS1NCN1hHNGdJQ0FnSUNCMllYSWdhWE5DYjJSNU8xeHVYRzRnSUNBZ0lDQmtieUI3WEc0Z0lDQWdJQ0FnSUdWc0lEMGdaV3d1Y0dGeVpXNTBUbTlrWlR0Y2JseHVJQ0FnSUNBZ0lDQnBjMEp2WkhrZ1BTQmxiQ0E5UFQwZ1pDNWliMlI1TzF4dUlDQWdJQ0FnZlNCM2FHbHNaU0FvYVhOQ2IyUjVJRDA5UFNCbVlXeHpaU0FtSmlCcGMxTmpjbTlzYkdGaWJHVW9aV3dwSUQwOVBTQm1ZV3h6WlNrN1hHNWNiaUFnSUNBZ0lHbHpRbTlrZVNBOUlHNTFiR3c3WEc1Y2JpQWdJQ0FnSUhKbGRIVnliaUJsYkR0Y2JpQWdJQ0I5WEc1Y2JpQWdJQ0F2S2lwY2JpQWdJQ0FnS2lCelpXeG1JR2x1ZG05clpXUWdablZ1WTNScGIyNGdkR2hoZEN3Z1oybDJaVzRnWVNCamIyNTBaWGgwTENCemRHVndjeUIwYUhKdmRXZG9JSE5qY205c2JHbHVaMXh1SUNBZ0lDQXFJRUJ0WlhSb2IyUWdjM1JsY0Z4dUlDQWdJQ0FxSUVCd1lYSmhiU0I3VDJKcVpXTjBmU0JqYjI1MFpYaDBYRzRnSUNBZ0lDb2dRSEpsZEhWeWJuTWdlM1Z1WkdWbWFXNWxaSDFjYmlBZ0lDQWdLaTljYmlBZ0lDQm1kVzVqZEdsdmJpQnpkR1Z3S0dOdmJuUmxlSFFwSUh0Y2JpQWdJQ0FnSUhaaGNpQjBhVzFsSUQwZ2JtOTNLQ2s3WEc0Z0lDQWdJQ0IyWVhJZ2RtRnNkV1U3WEc0Z0lDQWdJQ0IyWVhJZ1kzVnljbVZ1ZEZnN1hHNGdJQ0FnSUNCMllYSWdZM1Z5Y21WdWRGazdYRzRnSUNBZ0lDQjJZWElnWld4aGNITmxaQ0E5SUNoMGFXMWxJQzBnWTI5dWRHVjRkQzV6ZEdGeWRGUnBiV1VwSUM4Z1UwTlNUMHhNWDFSSlRVVTdYRzVjYmlBZ0lDQWdJQzh2SUdGMmIybGtJR1ZzWVhCelpXUWdkR2x0WlhNZ2FHbG5hR1Z5SUhSb1lXNGdiMjVsWEc0Z0lDQWdJQ0JsYkdGd2MyVmtJRDBnWld4aGNITmxaQ0ErSURFZ1B5QXhJRG9nWld4aGNITmxaRHRjYmx4dUlDQWdJQ0FnTHk4Z1lYQndiSGtnWldGemFXNW5JSFJ2SUdWc1lYQnpaV1FnZEdsdFpWeHVJQ0FnSUNBZ2RtRnNkV1VnUFNCbFlYTmxLR1ZzWVhCelpXUXBPMXh1WEc0Z0lDQWdJQ0JqZFhKeVpXNTBXQ0E5SUdOdmJuUmxlSFF1YzNSaGNuUllJQ3NnS0dOdmJuUmxlSFF1ZUNBdElHTnZiblJsZUhRdWMzUmhjblJZS1NBcUlIWmhiSFZsTzF4dUlDQWdJQ0FnWTNWeWNtVnVkRmtnUFNCamIyNTBaWGgwTG5OMFlYSjBXU0FySUNoamIyNTBaWGgwTG5rZ0xTQmpiMjUwWlhoMExuTjBZWEowV1NrZ0tpQjJZV3gxWlR0Y2JseHVJQ0FnSUNBZ1kyOXVkR1Y0ZEM1dFpYUm9iMlF1WTJGc2JDaGpiMjUwWlhoMExuTmpjbTlzYkdGaWJHVXNJR04xY25KbGJuUllMQ0JqZFhKeVpXNTBXU2s3WEc1Y2JpQWdJQ0FnSUM4dklITmpjbTlzYkNCdGIzSmxJR2xtSUhkbElHaGhkbVVnYm05MElISmxZV05vWldRZ2IzVnlJR1JsYzNScGJtRjBhVzl1WEc0Z0lDQWdJQ0JwWmlBb1kzVnljbVZ1ZEZnZ0lUMDlJR052Ym5SbGVIUXVlQ0I4ZkNCamRYSnlaVzUwV1NBaFBUMGdZMjl1ZEdWNGRDNTVLU0I3WEc0Z0lDQWdJQ0FnSUhjdWNtVnhkV1Z6ZEVGdWFXMWhkR2x2YmtaeVlXMWxLSE4wWlhBdVltbHVaQ2gzTENCamIyNTBaWGgwS1NrN1hHNGdJQ0FnSUNCOVhHNGdJQ0FnZlZ4dVhHNGdJQ0FnTHlvcVhHNGdJQ0FnSUNvZ2MyTnliMnhzY3lCM2FXNWtiM2NnYjNJZ1pXeGxiV1Z1ZENCM2FYUm9JR0VnYzIxdmIzUm9JR0psYUdGMmFXOXlYRzRnSUNBZ0lDb2dRRzFsZEdodlpDQnpiVzl2ZEdoVFkzSnZiR3hjYmlBZ0lDQWdLaUJBY0dGeVlXMGdlMDlpYW1WamRIeE9iMlJsZlNCbGJGeHVJQ0FnSUNBcUlFQndZWEpoYlNCN1RuVnRZbVZ5ZlNCNFhHNGdJQ0FnSUNvZ1FIQmhjbUZ0SUh0T2RXMWlaWEo5SUhsY2JpQWdJQ0FnS2lCQWNtVjBkWEp1Y3lCN2RXNWtaV1pwYm1Wa2ZWeHVJQ0FnSUNBcUwxeHVJQ0FnSUdaMWJtTjBhVzl1SUhOdGIyOTBhRk5qY205c2JDaGxiQ3dnZUN3Z2VTa2dlMXh1SUNBZ0lDQWdkbUZ5SUhOamNtOXNiR0ZpYkdVN1hHNGdJQ0FnSUNCMllYSWdjM1JoY25SWU8xeHVJQ0FnSUNBZ2RtRnlJSE4wWVhKMFdUdGNiaUFnSUNBZ0lIWmhjaUJ0WlhSb2IyUTdYRzRnSUNBZ0lDQjJZWElnYzNSaGNuUlVhVzFsSUQwZ2JtOTNLQ2s3WEc1Y2JpQWdJQ0FnSUM4dklHUmxabWx1WlNCelkzSnZiR3dnWTI5dWRHVjRkRnh1SUNBZ0lDQWdhV1lnS0dWc0lEMDlQU0JrTG1KdlpIa3BJSHRjYmlBZ0lDQWdJQ0FnYzJOeWIyeHNZV0pzWlNBOUlIYzdYRzRnSUNBZ0lDQWdJSE4wWVhKMFdDQTlJSGN1YzJOeWIyeHNXQ0I4ZkNCM0xuQmhaMlZZVDJabWMyVjBPMXh1SUNBZ0lDQWdJQ0J6ZEdGeWRGa2dQU0IzTG5OamNtOXNiRmtnZkh3Z2R5NXdZV2RsV1U5bVpuTmxkRHRjYmlBZ0lDQWdJQ0FnYldWMGFHOWtJRDBnYjNKcFoybHVZV3d1YzJOeWIyeHNPMXh1SUNBZ0lDQWdmU0JsYkhObElIdGNiaUFnSUNBZ0lDQWdjMk55YjJ4c1lXSnNaU0E5SUdWc08xeHVJQ0FnSUNBZ0lDQnpkR0Z5ZEZnZ1BTQmxiQzV6WTNKdmJHeE1aV1owTzF4dUlDQWdJQ0FnSUNCemRHRnlkRmtnUFNCbGJDNXpZM0p2Ykd4VWIzQTdYRzRnSUNBZ0lDQWdJRzFsZEdodlpDQTlJSE5qY205c2JFVnNaVzFsYm5RN1hHNGdJQ0FnSUNCOVhHNWNiaUFnSUNBZ0lDOHZJSE5qY205c2JDQnNiMjl3YVc1bklHOTJaWElnWVNCbWNtRnRaVnh1SUNBZ0lDQWdjM1JsY0NoN1hHNGdJQ0FnSUNBZ0lITmpjbTlzYkdGaWJHVTZJSE5qY205c2JHRmliR1VzWEc0Z0lDQWdJQ0FnSUcxbGRHaHZaRG9nYldWMGFHOWtMRnh1SUNBZ0lDQWdJQ0J6ZEdGeWRGUnBiV1U2SUhOMFlYSjBWR2x0WlN4Y2JpQWdJQ0FnSUNBZ2MzUmhjblJZT2lCemRHRnlkRmdzWEc0Z0lDQWdJQ0FnSUhOMFlYSjBXVG9nYzNSaGNuUlpMRnh1SUNBZ0lDQWdJQ0I0T2lCNExGeHVJQ0FnSUNBZ0lDQjVPaUI1WEc0Z0lDQWdJQ0I5S1R0Y2JpQWdJQ0I5WEc1Y2JpQWdJQ0F2THlCUFVrbEhTVTVCVENCTlJWUklUMFJUSUU5V1JWSlNTVVJGVTF4dUlDQWdJQzh2SUhjdWMyTnliMnhzSUdGdVpDQjNMbk5qY205c2JGUnZYRzRnSUNBZ2R5NXpZM0p2Ykd3Z1BTQjNMbk5qY205c2JGUnZJRDBnWm5WdVkzUnBiMjRvS1NCN1hHNGdJQ0FnSUNBdkx5QmhkbTlwWkNCaFkzUnBiMjRnZDJobGJpQnVieUJoY21kMWJXVnVkSE1nWVhKbElIQmhjM05sWkZ4dUlDQWdJQ0FnYVdZZ0tHRnlaM1Z0Wlc1MGMxc3dYU0E5UFQwZ2RXNWtaV1pwYm1Wa0tTQjdYRzRnSUNBZ0lDQWdJSEpsZEhWeWJqdGNiaUFnSUNBZ0lIMWNibHh1SUNBZ0lDQWdMeThnWVhadmFXUWdjMjF2YjNSb0lHSmxhR0YyYVc5eUlHbG1JRzV2ZENCeVpYRjFhWEpsWkZ4dUlDQWdJQ0FnYVdZZ0tITm9iM1ZzWkVKaGFXeFBkWFFvWVhKbmRXMWxiblJ6V3pCZEtTQTlQVDBnZEhKMVpTa2dlMXh1SUNBZ0lDQWdJQ0J2Y21sbmFXNWhiQzV6WTNKdmJHd3VZMkZzYkNoY2JpQWdJQ0FnSUNBZ0lDQjNMRnh1SUNBZ0lDQWdJQ0FnSUdGeVozVnRaVzUwYzFzd1hTNXNaV1owSUNFOVBTQjFibVJsWm1sdVpXUmNiaUFnSUNBZ0lDQWdJQ0FnSUQ4Z1lYSm5kVzFsYm5Seld6QmRMbXhsWm5SY2JpQWdJQ0FnSUNBZ0lDQWdJRG9nZEhsd1pXOW1JR0Z5WjNWdFpXNTBjMXN3WFNBaFBUMGdKMjlpYW1WamRDZGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ1B5QmhjbWQxYldWdWRITmJNRjFjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdPaUIzTG5OamNtOXNiRmdnZkh3Z2R5NXdZV2RsV0U5bVpuTmxkQ3hjYmlBZ0lDQWdJQ0FnSUNBdkx5QjFjMlVnZEc5d0lIQnliM0FzSUhObFkyOXVaQ0JoY21kMWJXVnVkQ0JwWmlCd2NtVnpaVzUwSUc5eUlHWmhiR3hpWVdOcklIUnZJSE5qY205c2JGbGNiaUFnSUNBZ0lDQWdJQ0JoY21kMWJXVnVkSE5iTUYwdWRHOXdJQ0U5UFNCMWJtUmxabWx1WldSY2JpQWdJQ0FnSUNBZ0lDQWdJRDhnWVhKbmRXMWxiblJ6V3pCZExuUnZjRnh1SUNBZ0lDQWdJQ0FnSUNBZ09pQmhjbWQxYldWdWRITmJNVjBnSVQwOUlIVnVaR1ZtYVc1bFpGeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBL0lHRnlaM1Z0Wlc1MGMxc3hYVnh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQTZJSGN1YzJOeWIyeHNXU0I4ZkNCM0xuQmhaMlZaVDJabWMyVjBYRzRnSUNBZ0lDQWdJQ2s3WEc1Y2JpQWdJQ0FnSUNBZ2NtVjBkWEp1TzF4dUlDQWdJQ0FnZlZ4dVhHNGdJQ0FnSUNBdkx5Qk1SVlFnVkVoRklGTk5UMDlVU0U1RlUxTWdRa1ZIU1U0aFhHNGdJQ0FnSUNCemJXOXZkR2hUWTNKdmJHd3VZMkZzYkNoY2JpQWdJQ0FnSUNBZ2R5eGNiaUFnSUNBZ0lDQWdaQzVpYjJSNUxGeHVJQ0FnSUNBZ0lDQmhjbWQxYldWdWRITmJNRjB1YkdWbWRDQWhQVDBnZFc1a1pXWnBibVZrWEc0Z0lDQWdJQ0FnSUNBZ1B5QitmbUZ5WjNWdFpXNTBjMXN3WFM1c1pXWjBYRzRnSUNBZ0lDQWdJQ0FnT2lCM0xuTmpjbTlzYkZnZ2ZId2dkeTV3WVdkbFdFOW1abk5sZEN4Y2JpQWdJQ0FnSUNBZ1lYSm5kVzFsYm5Seld6QmRMblJ2Y0NBaFBUMGdkVzVrWldacGJtVmtYRzRnSUNBZ0lDQWdJQ0FnUHlCK2ZtRnlaM1Z0Wlc1MGMxc3dYUzUwYjNCY2JpQWdJQ0FnSUNBZ0lDQTZJSGN1YzJOeWIyeHNXU0I4ZkNCM0xuQmhaMlZaVDJabWMyVjBYRzRnSUNBZ0lDQXBPMXh1SUNBZ0lIMDdYRzVjYmlBZ0lDQXZMeUIzTG5OamNtOXNiRUo1WEc0Z0lDQWdkeTV6WTNKdmJHeENlU0E5SUdaMWJtTjBhVzl1S0NrZ2UxeHVJQ0FnSUNBZ0x5OGdZWFp2YVdRZ1lXTjBhVzl1SUhkb1pXNGdibThnWVhKbmRXMWxiblJ6SUdGeVpTQndZWE56WldSY2JpQWdJQ0FnSUdsbUlDaGhjbWQxYldWdWRITmJNRjBnUFQwOUlIVnVaR1ZtYVc1bFpDa2dlMXh1SUNBZ0lDQWdJQ0J5WlhSMWNtNDdYRzRnSUNBZ0lDQjlYRzVjYmlBZ0lDQWdJQzh2SUdGMmIybGtJSE50YjI5MGFDQmlaV2hoZG1sdmNpQnBaaUJ1YjNRZ2NtVnhkV2x5WldSY2JpQWdJQ0FnSUdsbUlDaHphRzkxYkdSQ1lXbHNUM1YwS0dGeVozVnRaVzUwYzFzd1hTa3BJSHRjYmlBZ0lDQWdJQ0FnYjNKcFoybHVZV3d1YzJOeWIyeHNRbmt1WTJGc2JDaGNiaUFnSUNBZ0lDQWdJQ0IzTEZ4dUlDQWdJQ0FnSUNBZ0lHRnlaM1Z0Wlc1MGMxc3dYUzVzWldaMElDRTlQU0IxYm1SbFptbHVaV1JjYmlBZ0lDQWdJQ0FnSUNBZ0lEOGdZWEpuZFcxbGJuUnpXekJkTG14bFpuUmNiaUFnSUNBZ0lDQWdJQ0FnSURvZ2RIbHdaVzltSUdGeVozVnRaVzUwYzFzd1hTQWhQVDBnSjI5aWFtVmpkQ2NnUHlCaGNtZDFiV1Z1ZEhOYk1GMGdPaUF3TEZ4dUlDQWdJQ0FnSUNBZ0lHRnlaM1Z0Wlc1MGMxc3dYUzUwYjNBZ0lUMDlJSFZ1WkdWbWFXNWxaRnh1SUNBZ0lDQWdJQ0FnSUNBZ1B5QmhjbWQxYldWdWRITmJNRjB1ZEc5d1hHNGdJQ0FnSUNBZ0lDQWdJQ0E2SUdGeVozVnRaVzUwYzFzeFhTQWhQVDBnZFc1a1pXWnBibVZrSUQ4Z1lYSm5kVzFsYm5Seld6RmRJRG9nTUZ4dUlDQWdJQ0FnSUNBcE8xeHVYRzRnSUNBZ0lDQWdJSEpsZEhWeWJqdGNiaUFnSUNBZ0lIMWNibHh1SUNBZ0lDQWdMeThnVEVWVUlGUklSU0JUVFU5UFZFaE9SVk5USUVKRlIwbE9JVnh1SUNBZ0lDQWdjMjF2YjNSb1UyTnliMnhzTG1OaGJHd29YRzRnSUNBZ0lDQWdJSGNzWEc0Z0lDQWdJQ0FnSUdRdVltOWtlU3hjYmlBZ0lDQWdJQ0FnZm41aGNtZDFiV1Z1ZEhOYk1GMHViR1ZtZENBcklDaDNMbk5qY205c2JGZ2dmSHdnZHk1d1lXZGxXRTltWm5ObGRDa3NYRzRnSUNBZ0lDQWdJSDUrWVhKbmRXMWxiblJ6V3pCZExuUnZjQ0FySUNoM0xuTmpjbTlzYkZrZ2ZId2dkeTV3WVdkbFdVOW1abk5sZENsY2JpQWdJQ0FnSUNrN1hHNGdJQ0FnZlR0Y2JseHVJQ0FnSUM4dklFVnNaVzFsYm5RdWNISnZkRzkwZVhCbExuTmpjbTlzYkNCaGJtUWdSV3hsYldWdWRDNXdjbTkwYjNSNWNHVXVjMk55YjJ4c1ZHOWNiaUFnSUNCRmJHVnRaVzUwTG5CeWIzUnZkSGx3WlM1elkzSnZiR3dnUFNCRmJHVnRaVzUwTG5CeWIzUnZkSGx3WlM1elkzSnZiR3hVYnlBOUlHWjFibU4wYVc5dUtDa2dlMXh1SUNBZ0lDQWdMeThnWVhadmFXUWdZV04wYVc5dUlIZG9aVzRnYm04Z1lYSm5kVzFsYm5SeklHRnlaU0J3WVhOelpXUmNiaUFnSUNBZ0lHbG1JQ2hoY21kMWJXVnVkSE5iTUYwZ1BUMDlJSFZ1WkdWbWFXNWxaQ2tnZTF4dUlDQWdJQ0FnSUNCeVpYUjFjbTQ3WEc0Z0lDQWdJQ0I5WEc1Y2JpQWdJQ0FnSUM4dklHRjJiMmxrSUhOdGIyOTBhQ0JpWldoaGRtbHZjaUJwWmlCdWIzUWdjbVZ4ZFdseVpXUmNiaUFnSUNBZ0lHbG1JQ2h6YUc5MWJHUkNZV2xzVDNWMEtHRnlaM1Z0Wlc1MGMxc3dYU2tnUFQwOUlIUnlkV1VwSUh0Y2JpQWdJQ0FnSUNBZ0x5OGdhV1lnYjI1bElHNTFiV0psY2lCcGN5QndZWE56WldRc0lIUm9jbTkzSUdWeWNtOXlJSFJ2SUcxaGRHTm9JRVpwY21WbWIzZ2dhVzF3YkdWdFpXNTBZWFJwYjI1Y2JpQWdJQ0FnSUNBZ2FXWWdLSFI1Y0dWdlppQmhjbWQxYldWdWRITmJNRjBnUFQwOUlDZHVkVzFpWlhJbklDWW1JR0Z5WjNWdFpXNTBjMXN4WFNBOVBUMGdkVzVrWldacGJtVmtLU0I3WEc0Z0lDQWdJQ0FnSUNBZ2RHaHliM2NnYm1WM0lGTjViblJoZUVWeWNtOXlLQ2RXWVd4MVpTQmpiM1ZzWkNCdWIzUWdZbVVnWTI5dWRtVnlkR1ZrSnlrN1hHNGdJQ0FnSUNBZ0lIMWNibHh1SUNBZ0lDQWdJQ0J2Y21sbmFXNWhiQzVsYkdWdFpXNTBVMk55YjJ4c0xtTmhiR3dvWEc0Z0lDQWdJQ0FnSUNBZ2RHaHBjeXhjYmlBZ0lDQWdJQ0FnSUNBdkx5QjFjMlVnYkdWbWRDQndjbTl3TENCbWFYSnpkQ0J1ZFcxaVpYSWdZWEpuZFcxbGJuUWdiM0lnWm1Gc2JHSmhZMnNnZEc4Z2MyTnliMnhzVEdWbWRGeHVJQ0FnSUNBZ0lDQWdJR0Z5WjNWdFpXNTBjMXN3WFM1c1pXWjBJQ0U5UFNCMWJtUmxabWx1WldSY2JpQWdJQ0FnSUNBZ0lDQWdJRDhnZm41aGNtZDFiV1Z1ZEhOYk1GMHViR1ZtZEZ4dUlDQWdJQ0FnSUNBZ0lDQWdPaUIwZVhCbGIyWWdZWEpuZFcxbGJuUnpXekJkSUNFOVBTQW5iMkpxWldOMEp5QS9JSDUrWVhKbmRXMWxiblJ6V3pCZElEb2dkR2hwY3k1elkzSnZiR3hNWldaMExGeHVJQ0FnSUNBZ0lDQWdJQzh2SUhWelpTQjBiM0FnY0hKdmNDd2djMlZqYjI1a0lHRnlaM1Z0Wlc1MElHOXlJR1poYkd4aVlXTnJJSFJ2SUhOamNtOXNiRlJ2Y0Z4dUlDQWdJQ0FnSUNBZ0lHRnlaM1Z0Wlc1MGMxc3dYUzUwYjNBZ0lUMDlJSFZ1WkdWbWFXNWxaRnh1SUNBZ0lDQWdJQ0FnSUNBZ1B5QitmbUZ5WjNWdFpXNTBjMXN3WFM1MGIzQmNiaUFnSUNBZ0lDQWdJQ0FnSURvZ1lYSm5kVzFsYm5Seld6RmRJQ0U5UFNCMWJtUmxabWx1WldRZ1B5QitmbUZ5WjNWdFpXNTBjMXN4WFNBNklIUm9hWE11YzJOeWIyeHNWRzl3WEc0Z0lDQWdJQ0FnSUNrN1hHNWNiaUFnSUNBZ0lDQWdjbVYwZFhKdU8xeHVJQ0FnSUNBZ2ZWeHVYRzRnSUNBZ0lDQjJZWElnYkdWbWRDQTlJR0Z5WjNWdFpXNTBjMXN3WFM1c1pXWjBPMXh1SUNBZ0lDQWdkbUZ5SUhSdmNDQTlJR0Z5WjNWdFpXNTBjMXN3WFM1MGIzQTdYRzVjYmlBZ0lDQWdJQzh2SUV4RlZDQlVTRVVnVTAxUFQxUklUa1ZUVXlCQ1JVZEpUaUZjYmlBZ0lDQWdJSE50YjI5MGFGTmpjbTlzYkM1allXeHNLRnh1SUNBZ0lDQWdJQ0IwYUdsekxGeHVJQ0FnSUNBZ0lDQjBhR2x6TEZ4dUlDQWdJQ0FnSUNCMGVYQmxiMllnYkdWbWRDQTlQVDBnSjNWdVpHVm1hVzVsWkNjZ1B5QjBhR2x6TG5OamNtOXNiRXhsWm5RZ09pQitmbXhsWm5Rc1hHNGdJQ0FnSUNBZ0lIUjVjR1Z2WmlCMGIzQWdQVDA5SUNkMWJtUmxabWx1WldRbklEOGdkR2hwY3k1elkzSnZiR3hVYjNBZ09pQitmblJ2Y0Z4dUlDQWdJQ0FnS1R0Y2JpQWdJQ0I5TzF4dVhHNGdJQ0FnTHk4Z1JXeGxiV1Z1ZEM1d2NtOTBiM1I1Y0dVdWMyTnliMnhzUW5sY2JpQWdJQ0JGYkdWdFpXNTBMbkJ5YjNSdmRIbHdaUzV6WTNKdmJHeENlU0E5SUdaMWJtTjBhVzl1S0NrZ2UxeHVJQ0FnSUNBZ0x5OGdZWFp2YVdRZ1lXTjBhVzl1SUhkb1pXNGdibThnWVhKbmRXMWxiblJ6SUdGeVpTQndZWE56WldSY2JpQWdJQ0FnSUdsbUlDaGhjbWQxYldWdWRITmJNRjBnUFQwOUlIVnVaR1ZtYVc1bFpDa2dlMXh1SUNBZ0lDQWdJQ0J5WlhSMWNtNDdYRzRnSUNBZ0lDQjlYRzVjYmlBZ0lDQWdJQzh2SUdGMmIybGtJSE50YjI5MGFDQmlaV2hoZG1sdmNpQnBaaUJ1YjNRZ2NtVnhkV2x5WldSY2JpQWdJQ0FnSUdsbUlDaHphRzkxYkdSQ1lXbHNUM1YwS0dGeVozVnRaVzUwYzFzd1hTa2dQVDA5SUhSeWRXVXBJSHRjYmlBZ0lDQWdJQ0FnYjNKcFoybHVZV3d1Wld4bGJXVnVkRk5qY205c2JDNWpZV3hzS0Z4dUlDQWdJQ0FnSUNBZ0lIUm9hWE1zWEc0Z0lDQWdJQ0FnSUNBZ1lYSm5kVzFsYm5Seld6QmRMbXhsWm5RZ0lUMDlJSFZ1WkdWbWFXNWxaRnh1SUNBZ0lDQWdJQ0FnSUNBZ1B5QitmbUZ5WjNWdFpXNTBjMXN3WFM1c1pXWjBJQ3NnZEdocGN5NXpZM0p2Ykd4TVpXWjBYRzRnSUNBZ0lDQWdJQ0FnSUNBNklINStZWEpuZFcxbGJuUnpXekJkSUNzZ2RHaHBjeTV6WTNKdmJHeE1aV1owTEZ4dUlDQWdJQ0FnSUNBZ0lHRnlaM1Z0Wlc1MGMxc3dYUzUwYjNBZ0lUMDlJSFZ1WkdWbWFXNWxaRnh1SUNBZ0lDQWdJQ0FnSUNBZ1B5QitmbUZ5WjNWdFpXNTBjMXN3WFM1MGIzQWdLeUIwYUdsekxuTmpjbTlzYkZSdmNGeHVJQ0FnSUNBZ0lDQWdJQ0FnT2lCK2ZtRnlaM1Z0Wlc1MGMxc3hYU0FySUhSb2FYTXVjMk55YjJ4c1ZHOXdYRzRnSUNBZ0lDQWdJQ2s3WEc1Y2JpQWdJQ0FnSUNBZ2NtVjBkWEp1TzF4dUlDQWdJQ0FnZlZ4dVhHNGdJQ0FnSUNCMGFHbHpMbk5qY205c2JDaDdYRzRnSUNBZ0lDQWdJR3hsWm5RNklINStZWEpuZFcxbGJuUnpXekJkTG14bFpuUWdLeUIwYUdsekxuTmpjbTlzYkV4bFpuUXNYRzRnSUNBZ0lDQWdJSFJ2Y0RvZ2ZuNWhjbWQxYldWdWRITmJNRjB1ZEc5d0lDc2dkR2hwY3k1elkzSnZiR3hVYjNBc1hHNGdJQ0FnSUNBZ0lHSmxhR0YyYVc5eU9pQmhjbWQxYldWdWRITmJNRjB1WW1Wb1lYWnBiM0pjYmlBZ0lDQWdJSDBwTzF4dUlDQWdJSDA3WEc1Y2JpQWdJQ0F2THlCRmJHVnRaVzUwTG5CeWIzUnZkSGx3WlM1elkzSnZiR3hKYm5SdlZtbGxkMXh1SUNBZ0lFVnNaVzFsYm5RdWNISnZkRzkwZVhCbExuTmpjbTlzYkVsdWRHOVdhV1YzSUQwZ1puVnVZM1JwYjI0b0tTQjdYRzRnSUNBZ0lDQXZMeUJoZG05cFpDQnpiVzl2ZEdnZ1ltVm9ZWFpwYjNJZ2FXWWdibTkwSUhKbGNYVnBjbVZrWEc0Z0lDQWdJQ0JwWmlBb2MyaHZkV3hrUW1GcGJFOTFkQ2hoY21kMWJXVnVkSE5iTUYwcElEMDlQU0IwY25WbEtTQjdYRzRnSUNBZ0lDQWdJRzl5YVdkcGJtRnNMbk5qY205c2JFbHVkRzlXYVdWM0xtTmhiR3dvWEc0Z0lDQWdJQ0FnSUNBZ2RHaHBjeXhjYmlBZ0lDQWdJQ0FnSUNCaGNtZDFiV1Z1ZEhOYk1GMGdQVDA5SUhWdVpHVm1hVzVsWkNBL0lIUnlkV1VnT2lCaGNtZDFiV1Z1ZEhOYk1GMWNiaUFnSUNBZ0lDQWdLVHRjYmx4dUlDQWdJQ0FnSUNCeVpYUjFjbTQ3WEc0Z0lDQWdJQ0I5WEc1Y2JpQWdJQ0FnSUM4dklFeEZWQ0JVU0VVZ1UwMVBUMVJJVGtWVFV5QkNSVWRKVGlGY2JpQWdJQ0FnSUhaaGNpQnpZM0p2Ykd4aFlteGxVR0Z5Wlc1MElEMGdabWx1WkZOamNtOXNiR0ZpYkdWUVlYSmxiblFvZEdocGN5azdYRzRnSUNBZ0lDQjJZWElnY0dGeVpXNTBVbVZqZEhNZ1BTQnpZM0p2Ykd4aFlteGxVR0Z5Wlc1MExtZGxkRUp2ZFc1a2FXNW5RMnhwWlc1MFVtVmpkQ2dwTzF4dUlDQWdJQ0FnZG1GeUlHTnNhV1Z1ZEZKbFkzUnpJRDBnZEdocGN5NW5aWFJDYjNWdVpHbHVaME5zYVdWdWRGSmxZM1FvS1R0Y2JseHVJQ0FnSUNBZ2FXWWdLSE5qY205c2JHRmliR1ZRWVhKbGJuUWdJVDA5SUdRdVltOWtlU2tnZTF4dUlDQWdJQ0FnSUNBdkx5QnlaWFpsWVd3Z1pXeGxiV1Z1ZENCcGJuTnBaR1VnY0dGeVpXNTBYRzRnSUNBZ0lDQWdJSE50YjI5MGFGTmpjbTlzYkM1allXeHNLRnh1SUNBZ0lDQWdJQ0FnSUhSb2FYTXNYRzRnSUNBZ0lDQWdJQ0FnYzJOeWIyeHNZV0pzWlZCaGNtVnVkQ3hjYmlBZ0lDQWdJQ0FnSUNCelkzSnZiR3hoWW14bFVHRnlaVzUwTG5OamNtOXNiRXhsWm5RZ0t5QmpiR2xsYm5SU1pXTjBjeTVzWldaMElDMGdjR0Z5Wlc1MFVtVmpkSE11YkdWbWRDeGNiaUFnSUNBZ0lDQWdJQ0J6WTNKdmJHeGhZbXhsVUdGeVpXNTBMbk5qY205c2JGUnZjQ0FySUdOc2FXVnVkRkpsWTNSekxuUnZjQ0F0SUhCaGNtVnVkRkpsWTNSekxuUnZjRnh1SUNBZ0lDQWdJQ0FwTzF4dVhHNGdJQ0FnSUNBZ0lDOHZJSEpsZG1WaGJDQndZWEpsYm5RZ2FXNGdkbWxsZDNCdmNuUWdkVzVzWlhOeklHbHpJR1pwZUdWa1hHNGdJQ0FnSUNBZ0lHbG1JQ2gzTG1kbGRFTnZiWEIxZEdWa1UzUjViR1VvYzJOeWIyeHNZV0pzWlZCaGNtVnVkQ2t1Y0c5emFYUnBiMjRnSVQwOUlDZG1hWGhsWkNjcElIdGNiaUFnSUNBZ0lDQWdJQ0IzTG5OamNtOXNiRUo1S0h0Y2JpQWdJQ0FnSUNBZ0lDQWdJR3hsWm5RNklIQmhjbVZ1ZEZKbFkzUnpMbXhsWm5Rc1hHNGdJQ0FnSUNBZ0lDQWdJQ0IwYjNBNklIQmhjbVZ1ZEZKbFkzUnpMblJ2Y0N4Y2JpQWdJQ0FnSUNBZ0lDQWdJR0psYUdGMmFXOXlPaUFuYzIxdmIzUm9KMXh1SUNBZ0lDQWdJQ0FnSUgwcE8xeHVJQ0FnSUNBZ0lDQjlYRzRnSUNBZ0lDQjlJR1ZzYzJVZ2UxeHVJQ0FnSUNBZ0lDQXZMeUJ5WlhabFlXd2daV3hsYldWdWRDQnBiaUIyYVdWM2NHOXlkRnh1SUNBZ0lDQWdJQ0IzTG5OamNtOXNiRUo1S0h0Y2JpQWdJQ0FnSUNBZ0lDQnNaV1owT2lCamJHbGxiblJTWldOMGN5NXNaV1owTEZ4dUlDQWdJQ0FnSUNBZ0lIUnZjRG9nWTJ4cFpXNTBVbVZqZEhNdWRHOXdMRnh1SUNBZ0lDQWdJQ0FnSUdKbGFHRjJhVzl5T2lBbmMyMXZiM1JvSjF4dUlDQWdJQ0FnSUNCOUtUdGNiaUFnSUNBZ0lIMWNiaUFnSUNCOU8xeHVJQ0I5WEc1Y2JpQWdhV1lnS0hSNWNHVnZaaUJsZUhCdmNuUnpJRDA5UFNBbmIySnFaV04wSnlBbUppQjBlWEJsYjJZZ2JXOWtkV3hsSUNFOVBTQW5kVzVrWldacGJtVmtKeWtnZTF4dUlDQWdJQzh2SUdOdmJXMXZibXB6WEc0Z0lDQWdiVzlrZFd4bExtVjRjRzl5ZEhNZ1BTQjdJSEJ2YkhsbWFXeHNPaUJ3YjJ4NVptbHNiQ0I5TzF4dUlDQjlJR1ZzYzJVZ2UxeHVJQ0FnSUM4dklHZHNiMkpoYkZ4dUlDQWdJSEJ2YkhsbWFXeHNLQ2s3WEc0Z0lIMWNibHh1ZlNncEtUdGNiaUlzSW1OdmJuTjBJRVJDSUQwZ0oyaDBkSEJ6T2k4dmJtVjRkWE10WTJGMFlXeHZaeTVtYVhKbFltRnpaV2x2TG1OdmJTOXdiM04wY3k1cWMyOXVQMkYxZEdnOU4yYzNjSGxMUzNsclRqTk9OV1YzY2tsdGFFOWhVeloyZDNKR2MyTTFaa3RyY21zNFpXcDZaaWM3WEc1amIyNXpkQ0JoYkhCb1lXSmxkQ0E5SUZzbllTY3NJQ2RpSnl3Z0oyTW5MQ0FuWkNjc0lDZGxKeXdnSjJZbkxDQW5aeWNzSUNkb0p5d2dKMmtuTENBbmFpY3NJQ2RySnl3Z0oyd25MQ0FuYlNjc0lDZHVKeXdnSjI4bkxDQW5jQ2NzSUNkeUp5d2dKM01uTENBbmRDY3NJQ2QxSnl3Z0ozWW5MQ0FuZHljc0lDZDVKeXdnSjNvblhUdGNibHh1WTI5dWMzUWdKR3h2WVdScGJtY2dQU0JCY25KaGVTNW1jbTl0S0dSdlkzVnRaVzUwTG5GMVpYSjVVMlZzWldOMGIzSkJiR3dvSnk1c2IyRmthVzVuSnlrcE8xeHVZMjl1YzNRZ0pHNWhkaUE5SUdSdlkzVnRaVzUwTG1kbGRFVnNaVzFsYm5SQ2VVbGtLQ2RxY3kxdVlYWW5LVHRjYm1OdmJuTjBJQ1J3WVhKaGJHeGhlQ0E5SUdSdlkzVnRaVzUwTG5GMVpYSjVVMlZzWldOMGIzSW9KeTV3WVhKaGJHeGhlQ2NwTzF4dVkyOXVjM1FnSkdOdmJuUmxiblFnUFNCa2IyTjFiV1Z1ZEM1eGRXVnllVk5sYkdWamRHOXlLQ2N1WTI5dWRHVnVkQ2NwTzF4dVkyOXVjM1FnSkhScGRHeGxJRDBnWkc5amRXMWxiblF1WjJWMFJXeGxiV1Z1ZEVKNVNXUW9KMnB6TFhScGRHeGxKeWs3WEc1amIyNXpkQ0FrWVhKeWIzY2dQU0JrYjJOMWJXVnVkQzV4ZFdWeWVWTmxiR1ZqZEc5eUtDY3VZWEp5YjNjbktUdGNibU52Ym5OMElDUnRiMlJoYkNBOUlHUnZZM1Z0Wlc1MExuRjFaWEo1VTJWc1pXTjBiM0lvSnk1dGIyUmhiQ2NwTzF4dVkyOXVjM1FnSkd4cFoyaDBZbTk0SUQwZ1pHOWpkVzFsYm5RdWNYVmxjbmxUWld4bFkzUnZjaWduTG14cFoyaDBZbTk0SnlrN1hHNWpiMjV6ZENBa2RtbGxkeUE5SUdSdlkzVnRaVzUwTG5GMVpYSjVVMlZzWldOMGIzSW9KeTVzYVdkb2RHSnZlQzEyYVdWM0p5azdYRzVjYm1WNGNHOXlkQ0I3SUZ4dVhIUkVRaXdnWEc1Y2RHRnNjR2hoWW1WMExDQmNibHgwSkd4dllXUnBibWNzSUZ4dVhIUWtibUYyTENCY2JseDBKSEJoY21Gc2JHRjRMRnh1WEhRa1kyOXVkR1Z1ZEN4Y2JseDBKSFJwZEd4bExGeHVYSFFrWVhKeWIzY3NYRzVjZENSdGIyUmhiQ3hjYmx4MEpHeHBaMmgwWW05NExGeHVYSFFrZG1sbGR5QmNibjA3SWl3aWFXMXdiM0owSUhOdGIyOTBhSE5qY205c2JDQm1jbTl0SUNkemJXOXZkR2h6WTNKdmJHd3RjRzlzZVdacGJHd25PMXh1WEc1cGJYQnZjblFnZXlCaGNuUnBZMnhsVkdWdGNHeGhkR1VzSUc1aGRreG5JSDBnWm5KdmJTQW5MaTkwWlcxd2JHRjBaWE1uTzF4dWFXMXdiM0owSUhzZ1pHVmliM1Z1WTJVc0lHaHBaR1ZNYjJGa2FXNW5JSDBnWm5KdmJTQW5MaTkxZEdsc2N5YzdYRzVwYlhCdmNuUWdleUJFUWl3Z1lXeHdhR0ZpWlhRc0lDUnNiMkZrYVc1bkxDQWtibUYyTENBa2NHRnlZV3hzWVhnc0lDUmpiMjUwWlc1MExDQWtkR2wwYkdVc0lDUmhjbkp2ZHl3Z0pHMXZaR0ZzTENBa2JHbG5hSFJpYjNnc0lDUjJhV1YzSUgwZ1puSnZiU0FuTGk5amIyNXpkR0Z1ZEhNbk8xeHVYRzVzWlhRZ2MyOXlkRXRsZVNBOUlEQTdJQzh2SURBZ1BTQmhjblJwYzNRc0lERWdQU0IwYVhSc1pWeHViR1YwSUdWdWRISnBaWE1nUFNCN0lHSjVRWFYwYUc5eU9pQmJYU3dnWW5sVWFYUnNaVG9nVzEwZ2ZUdGNibXhsZENCamRYSnlaVzUwVEdWMGRHVnlJRDBnSjBFbk8xeHViR1YwSUcxdlpHRnNJRDBnWm1Gc2MyVTdYRzVzWlhRZ2JHbG5hSFJpYjNnZ1BTQm1ZV3h6WlR0Y2JseHVZMjl1YzNRZ1lYUjBZV05vU1cxaFoyVk1hWE4wWlc1bGNuTWdQU0FvS1NBOVBpQjdYRzVjZEdOdmJuTjBJQ1JwYldGblpYTWdQU0JCY25KaGVTNW1jbTl0S0dSdlkzVnRaVzUwTG5GMVpYSjVVMlZzWldOMGIzSkJiR3dvSnk1aGNuUnBZMnhsTFdsdFlXZGxKeWtwTzF4dVhHNWNkQ1JwYldGblpYTXVabTl5UldGamFDaHBiV2NnUFQ0Z2UxeHVYSFJjZEdsdFp5NWhaR1JGZG1WdWRFeHBjM1JsYm1WeUtDZGpiR2xqYXljc0lDaGxkblFwSUQwK0lIdGNibHgwWEhSY2RHbG1JQ2doYkdsbmFIUmliM2dwSUh0Y2JseDBYSFJjZEZ4MGJHVjBJSE55WXlBOUlHbHRaeTV6Y21NN1hHNWNkRngwWEhSY2RGeHVYSFJjZEZ4MFhIUWtiR2xuYUhSaWIzZ3VZMnhoYzNOTWFYTjBMbUZrWkNnbmMyaHZkeTFwYldjbktUdGNibHgwWEhSY2RGeDBKSFpwWlhjdWMyVjBRWFIwY21saWRYUmxLQ2R6ZEhsc1pTY3NJR0JpWVdOclozSnZkVzVrTFdsdFlXZGxPaUIxY213b0pIdHpjbU45S1dBcE8xeHVYSFJjZEZ4MFhIUnNhV2RvZEdKdmVDQTlJSFJ5ZFdVN1hHNWNkRngwWEhSOVhHNWNkRngwZlNrN1hHNWNkSDBwTzF4dVhHNWNkQ1IyYVdWM0xtRmtaRVYyWlc1MFRHbHpkR1Z1WlhJb0oyTnNhV05ySnl3Z0tDa2dQVDRnZTF4dVhIUmNkR2xtSUNoc2FXZG9kR0p2ZUNrZ2UxeHVYSFJjZEZ4MEpHeHBaMmgwWW05NExtTnNZWE56VEdsemRDNXlaVzF2ZG1Vb0ozTm9iM2N0YVcxbkp5azdYRzVjZEZ4MFhIUnNhV2RvZEdKdmVDQTlJR1poYkhObE8xeHVYSFJjZEgxY2JseDBmU2s3WEc1OU8xeHVYRzVqYjI1emRDQmhkSFJoWTJoTmIyUmhiRXhwYzNSbGJtVnljeUE5SUNncElEMCtJSHRjYmx4MFkyOXVjM1FnSkdacGJtUWdQU0JrYjJOMWJXVnVkQzVuWlhSRmJHVnRaVzUwUW5sSlpDZ25hbk10Wm1sdVpDY3BPMXh1WEhSY2JseDBKR1pwYm1RdVlXUmtSWFpsYm5STWFYTjBaVzVsY2lnblkyeHBZMnNuTENBb0tTQTlQaUI3WEc1Y2RGeDBKRzF2WkdGc0xtTnNZWE56VEdsemRDNWhaR1FvSjNOb2IzY25LVHRjYmx4MFhIUnRiMlJoYkNBOUlIUnlkV1U3WEc1Y2RIMHBPMXh1WEc1Y2RDUnRiMlJoYkM1aFpHUkZkbVZ1ZEV4cGMzUmxibVZ5S0NkamJHbGpheWNzSUNncElEMCtJSHRjYmx4MFhIUWtiVzlrWVd3dVkyeGhjM05NYVhOMExuSmxiVzkyWlNnbmMyaHZkeWNwTzF4dVhIUmNkRzF2WkdGc0lEMGdabUZzYzJVN1hHNWNkSDBwTzF4dVhHNWNkSGRwYm1SdmR5NWhaR1JGZG1WdWRFeHBjM1JsYm1WeUtDZHJaWGxrYjNkdUp5d2dLQ2tnUFQ0Z2UxeHVYSFJjZEdsbUlDaHRiMlJoYkNrZ2UxeHVYSFJjZEZ4MGMyVjBWR2x0Wlc5MWRDZ29LU0E5UGlCN1hHNWNkRngwWEhSY2RDUnRiMlJoYkM1amJHRnpjMHhwYzNRdWNtVnRiM1psS0NkemFHOTNKeWs3WEc1Y2RGeDBYSFJjZEcxdlpHRnNJRDBnWm1Gc2MyVTdYRzVjZEZ4MFhIUjlMQ0EyTURBcE8xeHVYSFJjZEgwN1hHNWNkSDBwTzF4dWZWeHVYRzVqYjI1emRDQnpZM0p2Ykd4VWIxUnZjQ0E5SUNncElEMCtJSHRjYmx4MGJHVjBJSFJvYVc1bklEMGdaRzlqZFcxbGJuUXVaMlYwUld4bGJXVnVkRUo1U1dRb0oyRnVZMmh2Y2kxMFlYSm5aWFFuS1R0Y2JseDBkR2hwYm1jdWMyTnliMnhzU1c1MGIxWnBaWGNvZTJKbGFHRjJhVzl5T2lCY0luTnRiMjkwYUZ3aUxDQmliRzlqYXpvZ1hDSnpkR0Z5ZEZ3aWZTazdYRzU5WEc1Y2JteGxkQ0J3Y21WMk8xeHViR1YwSUdOMWNuSmxiblFnUFNBd08xeHViR1YwSUdselUyaHZkMmx1WnlBOUlHWmhiSE5sTzF4dVkyOXVjM1FnWVhSMFlXTm9RWEp5YjNkTWFYTjBaVzVsY25NZ1BTQW9LU0E5UGlCN1hHNWNkQ1JoY25KdmR5NWhaR1JGZG1WdWRFeHBjM1JsYm1WeUtDZGpiR2xqYXljc0lDZ3BJRDArSUh0Y2JseDBYSFJ6WTNKdmJHeFViMVJ2Y0NncE8xeHVYSFI5S1R0Y2JseHVYSFFrY0dGeVlXeHNZWGd1WVdSa1JYWmxiblJNYVhOMFpXNWxjaWduYzJOeWIyeHNKeXdnS0NrZ1BUNGdlMXh1WEc1Y2RGeDBiR1YwSUhrZ1BTQWtkR2wwYkdVdVoyVjBRbTkxYm1ScGJtZERiR2xsYm5SU1pXTjBLQ2t1ZVR0Y2JseDBYSFJwWmlBb1kzVnljbVZ1ZENBaFBUMGdlU2tnZTF4dVhIUmNkRngwY0hKbGRpQTlJR04xY25KbGJuUTdYRzVjZEZ4MFhIUmpkWEp5Wlc1MElEMGdlVHRjYmx4MFhIUjlYRzVjYmx4MFhIUnBaaUFvZVNBOFBTQXROVEFnSmlZZ0lXbHpVMmh2ZDJsdVp5a2dlMXh1WEhSY2RGeDBKR0Z5Y205M0xtTnNZWE56VEdsemRDNWhaR1FvSjNOb2IzY25LVHRjYmx4MFhIUmNkR2x6VTJodmQybHVaeUE5SUhSeWRXVTdYRzVjZEZ4MGZTQmxiSE5sSUdsbUlDaDVJRDRnTFRVd0lDWW1JR2x6VTJodmQybHVaeWtnZTF4dVhIUmNkRngwSkdGeWNtOTNMbU5zWVhOelRHbHpkQzV5WlcxdmRtVW9KM05vYjNjbktUdGNibHgwWEhSY2RHbHpVMmh2ZDJsdVp5QTlJR1poYkhObE8xeHVYSFJjZEgxY2JseDBmU2s3WEc1OU8xeHVYRzVqYjI1emRDQmhaR1JUYjNKMFFuVjBkRzl1VEdsemRHVnVaWEp6SUQwZ0tDa2dQVDRnZTF4dVhIUnNaWFFnSkdKNVFYSjBhWE4wSUQwZ1pHOWpkVzFsYm5RdVoyVjBSV3hsYldWdWRFSjVTV1FvSjJwekxXSjVMV0Z5ZEdsemRDY3BPMXh1WEhSc1pYUWdKR0o1VkdsMGJHVWdQU0JrYjJOMWJXVnVkQzVuWlhSRmJHVnRaVzUwUW5sSlpDZ25hbk10WW5rdGRHbDBiR1VuS1R0Y2JseDBKR0o1UVhKMGFYTjBMbUZrWkVWMlpXNTBUR2x6ZEdWdVpYSW9KMk5zYVdOckp5d2dLQ2tnUFQ0Z2UxeHVYSFJjZEdsbUlDaHpiM0owUzJWNUtTQjdYRzVjZEZ4MFhIUnpZM0p2Ykd4VWIxUnZjQ2dwTzF4dVhIUmNkRngwYzI5eWRFdGxlU0E5SURBN1hHNWNkRngwWEhRa1lubEJjblJwYzNRdVkyeGhjM05NYVhOMExtRmtaQ2duWVdOMGFYWmxKeWs3WEc1Y2RGeDBYSFFrWW5sVWFYUnNaUzVqYkdGemMweHBjM1F1Y21WdGIzWmxLQ2RoWTNScGRtVW5LVHRjYmx4dVhIUmNkRngwY21WdVpHVnlSVzUwY21sbGN5Z3BPMXh1WEhSY2RIMWNibHgwZlNrN1hHNWNibHgwSkdKNVZHbDBiR1V1WVdSa1JYWmxiblJNYVhOMFpXNWxjaWduWTJ4cFkyc25MQ0FvS1NBOVBpQjdYRzVjZEZ4MGFXWWdLQ0Z6YjNKMFMyVjVLU0I3WEc1Y2RGeDBYSFJ6WTNKdmJHeFViMVJ2Y0NncE8xeHVYSFJjZEZ4MGMyOXlkRXRsZVNBOUlERTdYRzVjZEZ4MFhIUWtZbmxVYVhSc1pTNWpiR0Z6YzB4cGMzUXVZV1JrS0NkaFkzUnBkbVVuS1R0Y2JseDBYSFJjZENSaWVVRnlkR2x6ZEM1amJHRnpjMHhwYzNRdWNtVnRiM1psS0NkaFkzUnBkbVVuS1R0Y2JseHVYSFJjZEZ4MGNtVnVaR1Z5Ulc1MGNtbGxjeWdwTzF4dVhIUmNkSDFjYmx4MGZTazdYRzU5TzF4dVhHNWpiMjV6ZENCamJHVmhja0Z1WTJodmNuTWdQU0FvY0hKbGRsTmxiR1ZqZEc5eUtTQTlQaUI3WEc1Y2RHeGxkQ0FrWlc1MGNtbGxjeUE5SUVGeWNtRjVMbVp5YjIwb1pHOWpkVzFsYm5RdWNYVmxjbmxUWld4bFkzUnZja0ZzYkNod2NtVjJVMlZzWldOMGIzSXBLVHRjYmx4MEpHVnVkSEpwWlhNdVptOXlSV0ZqYUNobGJuUnllU0E5UGlCbGJuUnllUzV5WlcxdmRtVkJkSFJ5YVdKMWRHVW9KMjVoYldVbktTazdYRzU5TzF4dVhHNWpiMjV6ZENCbWFXNWtSbWx5YzNSRmJuUnllU0E5SUNoamFHRnlLU0E5UGlCN1hHNWNkR3hsZENCelpXeGxZM1J2Y2lBOUlITnZjblJMWlhrZ1B5QW5MbXB6TFdWdWRISjVMWFJwZEd4bEp5QTZJQ2N1YW5NdFpXNTBjbmt0WVhKMGFYTjBKenRjYmx4MGJHVjBJSEJ5WlhaVFpXeGxZM1J2Y2lBOUlDRnpiM0owUzJWNUlEOGdKeTVxY3kxbGJuUnllUzEwYVhSc1pTY2dPaUFuTG1wekxXVnVkSEo1TFdGeWRHbHpkQ2M3WEc1Y2RHeGxkQ0FrWlc1MGNtbGxjeUE5SUVGeWNtRjVMbVp5YjIwb1pHOWpkVzFsYm5RdWNYVmxjbmxUWld4bFkzUnZja0ZzYkNoelpXeGxZM1J2Y2lrcE8xeHVYRzVjZEdOc1pXRnlRVzVqYUc5eWN5aHdjbVYyVTJWc1pXTjBiM0lwTzF4dVhHNWNkSEpsZEhWeWJpQWtaVzUwY21sbGN5NW1hVzVrS0dWdWRISjVJRDArSUh0Y2JseDBYSFJzWlhRZ2JtOWtaU0E5SUdWdWRISjVMbTVsZUhSRmJHVnRaVzUwVTJsaWJHbHVaenRjYmx4MFhIUnlaWFIxY200Z2JtOWtaUzVwYm01bGNraFVUVXhiTUYwZ1BUMDlJR05vWVhJZ2ZId2dibTlrWlM1cGJtNWxja2hVVFV4Yk1GMGdQVDA5SUdOb1lYSXVkRzlWY0hCbGNrTmhjMlVvS1R0Y2JseDBmU2s3WEc1OU8xeHVYRzVjYm1OdmJuTjBJRzFoYTJWQmJIQm9ZV0psZENBOUlDZ3BJRDArSUh0Y2JseDBZMjl1YzNRZ1lYUjBZV05vUVc1amFHOXlUR2x6ZEdWdVpYSWdQU0FvSkdGdVkyaHZjaXdnYkdWMGRHVnlLU0E5UGlCN1hHNWNkRngwSkdGdVkyaHZjaTVoWkdSRmRtVnVkRXhwYzNSbGJtVnlLQ2RqYkdsamF5Y3NJQ2dwSUQwK0lIdGNibHgwWEhSY2RHTnZibk4wSUd4bGRIUmxjazV2WkdVZ1BTQmtiMk4xYldWdWRDNW5aWFJGYkdWdFpXNTBRbmxKWkNoc1pYUjBaWElwTzF4dVhIUmNkRngwYkdWMElIUmhjbWRsZER0Y2JseHVYSFJjZEZ4MGFXWWdLQ0Z6YjNKMFMyVjVLU0I3WEc1Y2RGeDBYSFJjZEhSaGNtZGxkQ0E5SUd4bGRIUmxjaUE5UFQwZ0oyRW5JRDhnWkc5amRXMWxiblF1WjJWMFJXeGxiV1Z1ZEVKNVNXUW9KMkZ1WTJodmNpMTBZWEpuWlhRbktTQTZJR3hsZEhSbGNrNXZaR1V1Y0dGeVpXNTBSV3hsYldWdWRDNXdZWEpsYm5SRmJHVnRaVzUwTG5CaGNtVnVkRVZzWlcxbGJuUXVjR0Z5Wlc1MFJXeGxiV1Z1ZEM1d2NtVjJhVzkxYzBWc1pXMWxiblJUYVdKc2FXNW5MbkYxWlhKNVUyVnNaV04wYjNJb0p5NXFjeTFoY25ScFkyeGxMV0Z1WTJodmNpMTBZWEpuWlhRbktUdGNibHgwWEhSY2RIMGdaV3h6WlNCN1hHNWNkRngwWEhSY2RIUmhjbWRsZENBOUlHeGxkSFJsY2lBOVBUMGdKMkVuSUQ4Z1pHOWpkVzFsYm5RdVoyVjBSV3hsYldWdWRFSjVTV1FvSjJGdVkyaHZjaTEwWVhKblpYUW5LU0E2SUd4bGRIUmxjazV2WkdVdWNHRnlaVzUwUld4bGJXVnVkQzV3WVhKbGJuUkZiR1Z0Wlc1MExuQmhjbVZ1ZEVWc1pXMWxiblF1Y0hKbGRtbHZkWE5GYkdWdFpXNTBVMmxpYkdsdVp5NXhkV1Z5ZVZObGJHVmpkRzl5S0NjdWFuTXRZWEowYVdOc1pTMWhibU5vYjNJdGRHRnlaMlYwSnlrN1hHNWNkRngwWEhSOU8xeHVYRzVjZEZ4MFhIUjBZWEpuWlhRdWMyTnliMnhzU1c1MGIxWnBaWGNvZTJKbGFHRjJhVzl5T2lCY0luTnRiMjkwYUZ3aUxDQmliRzlqYXpvZ1hDSnpkR0Z5ZEZ3aWZTazdYRzVjZEZ4MGZTazdYRzVjZEgwN1hHNWNibHgwYkdWMElHRmpkR2wyWlVWdWRISnBaWE1nUFNCN2ZUdGNibHgwYkdWMElDUnZkWFJsY2lBOUlHUnZZM1Z0Wlc1MExuRjFaWEo1VTJWc1pXTjBiM0lvSnk1aGJIQm9ZV0psZEY5ZmJHVjBkR1Z5Y3ljcE8xeHVYSFFrYjNWMFpYSXVhVzV1WlhKSVZFMU1JRDBnSnljN1hHNWNibHgwWVd4d2FHRmlaWFF1Wm05eVJXRmphQ2hzWlhSMFpYSWdQVDRnZTF4dVhIUmNkR3hsZENBa1ptbHljM1JGYm5SeWVTQTlJR1pwYm1SR2FYSnpkRVZ1ZEhKNUtHeGxkSFJsY2lrN1hHNWNkRngwYkdWMElDUmhibU5vYjNJZ1BTQmtiMk4xYldWdWRDNWpjbVZoZEdWRmJHVnRaVzUwS0NkaEp5azdYRzVjYmx4MFhIUnBaaUFvSVNSbWFYSnpkRVZ1ZEhKNUtTQnlaWFIxY200N1hHNWNibHgwWEhRa1ptbHljM1JGYm5SeWVTNXBaQ0E5SUd4bGRIUmxjanRjYmx4MFhIUWtZVzVqYUc5eUxtbHVibVZ5U0ZSTlRDQTlJR3hsZEhSbGNpNTBiMVZ3Y0dWeVEyRnpaU2dwTzF4dVhIUmNkQ1JoYm1Ob2IzSXVZMnhoYzNOT1lXMWxJRDBnSjJGc2NHaGhZbVYwWDE5c1pYUjBaWEl0WVc1amFHOXlKenRjYmx4dVhIUmNkR0YwZEdGamFFRnVZMmh2Y2t4cGMzUmxibVZ5S0NSaGJtTm9iM0lzSUd4bGRIUmxjaWs3WEc1Y2RGeDBKRzkxZEdWeUxtRndjR1Z1WkVOb2FXeGtLQ1JoYm1Ob2IzSXBPMXh1WEhSOUtUdGNibjA3WEc1Y2JtTnZibk4wSUhKbGJtUmxja2x0WVdkbGN5QTlJQ2hwYldGblpYTXNJQ1JwYldGblpYTXBJRDArSUh0Y2JseDBhVzFoWjJWekxtWnZja1ZoWTJnb2FXMWhaMlVnUFQ0Z2UxeHVYSFJjZEdOdmJuTjBJSE55WXlBOUlHQXVMaTh1TGk5aGMzTmxkSE12YVcxaFoyVnpMeVI3YVcxaFoyVjlZRHRjYmx4MFhIUmpiMjV6ZENBa2FXMW5UM1YwWlhJZ1BTQmtiMk4xYldWdWRDNWpjbVZoZEdWRmJHVnRaVzUwS0Nka2FYWW5LVHRjYmx4MFhIUmpiMjV6ZENBa2FXMW5JRDBnWkc5amRXMWxiblF1WTNKbFlYUmxSV3hsYldWdWRDZ25TVTFISnlrN1hHNWNkRngwSkdsdFp5NWpiR0Z6YzA1aGJXVWdQU0FuWVhKMGFXTnNaUzFwYldGblpTYzdYRzVjZEZ4MEpHbHRaeTV6Y21NZ1BTQnpjbU03WEc1Y2RGeDBKR2x0WjA5MWRHVnlMbUZ3Y0dWdVpFTm9hV3hrS0NScGJXY3BPMXh1WEhSY2RDUnBiV0ZuWlhNdVlYQndaVzVrUTJocGJHUW9KR2x0WjA5MWRHVnlLVHRjYmx4MGZTbGNibjA3WEc1Y2JtTnZibk4wSUhKbGJtUmxja1Z1ZEhKcFpYTWdQU0FvS1NBOVBpQjdYRzVjZEdOdmJuTjBJQ1JoY25ScFkyeGxUR2x6ZENBOUlHUnZZM1Z0Wlc1MExtZGxkRVZzWlcxbGJuUkNlVWxrS0NkcWN5MXNhWE4wSnlrN1hHNWNkR052Ym5OMElHVnVkSEpwWlhOTWFYTjBJRDBnYzI5eWRFdGxlU0EvSUdWdWRISnBaWE11WW5sVWFYUnNaU0E2SUdWdWRISnBaWE11WW5sQmRYUm9iM0k3WEc1Y2JseDBKR0Z5ZEdsamJHVk1hWE4wTG1sdWJtVnlTRlJOVENBOUlDY25PMXh1WEc1Y2RHVnVkSEpwWlhOTWFYTjBMbVp2Y2tWaFkyZ29aVzUwY25rZ1BUNGdlMXh1WEhSY2RHTnZibk4wSUhzZ2RHbDBiR1VzSUd4aGMzUk9ZVzFsTENCbWFYSnpkRTVoYldVc0lHbHRZV2RsY3l3Z1pHVnpZM0pwY0hScGIyNHNJR1JsZEdGcGJDQjlJRDBnWlc1MGNuazdYRzVjYmx4MFhIUWtZWEowYVdOc1pVeHBjM1F1YVc1elpYSjBRV1JxWVdObGJuUklWRTFNS0NkaVpXWnZjbVZsYm1RbkxDQmhjblJwWTJ4bFZHVnRjR3hoZEdVcE8xeHVYRzVjZEZ4MFkyOXVjM1FnSkdGc2JGTnNhV1JsY25NZ1BTQmtiMk4xYldWdWRDNXhkV1Z5ZVZObGJHVmpkRzl5UVd4c0tDY3VZWEowYVdOc1pWOWZjMnhwWkdWeUxXbHVibVZ5SnlrN1hHNWNkRngwWTI5dWMzUWdKSE5zYVdSbGNpQTlJQ1JoYkd4VGJHbGtaWEp6V3lSaGJHeFRiR2xrWlhKekxteGxibWQwYUNBdElERmRPMXh1WEhSY2RDOHZJR052Ym5OMElDUnBiV0ZuWlhNZ1BTQWtjMnhwWkdWeUxuRjFaWEo1VTJWc1pXTjBiM0lvSnk1aGNuUnBZMnhsWDE5cGJXRm5aWE1uS1R0Y2JseHVYSFJjZEdsbUlDaHBiV0ZuWlhNdWJHVnVaM1JvS1NCeVpXNWtaWEpKYldGblpYTW9hVzFoWjJWekxDQWtjMnhwWkdWeUtUdGNibHgwWEhSY2JseDBYSFJqYjI1emRDQWtaR1Z6WTNKcGNIUnBiMjVQZFhSbGNpQTlJR1J2WTNWdFpXNTBMbU55WldGMFpVVnNaVzFsYm5Rb0oyUnBkaWNwTzF4dVhIUmNkR052Ym5OMElDUmtaWE5qY21sd2RHbHZiazV2WkdVZ1BTQmtiMk4xYldWdWRDNWpjbVZoZEdWRmJHVnRaVzUwS0Nkd0p5azdYRzVjZEZ4MFkyOXVjM1FnSkdSbGRHRnBiRTV2WkdVZ1BTQmtiMk4xYldWdWRDNWpjbVZoZEdWRmJHVnRaVzUwS0Nkd0p5azdYRzVjZEZ4MEpHUmxjMk55YVhCMGFXOXVUM1YwWlhJdVkyeGhjM05NYVhOMExtRmtaQ2duWVhKMGFXTnNaUzFrWlhOamNtbHdkR2x2Ymw5ZmIzVjBaWEluS1R0Y2JseDBYSFFrWkdWelkzSnBjSFJwYjI1T2IyUmxMbU5zWVhOelRHbHpkQzVoWkdRb0oyRnlkR2xqYkdVdFpHVnpZM0pwY0hScGIyNG5LVHRjYmx4MFhIUWtaR1YwWVdsc1RtOWtaUzVqYkdGemMweHBjM1F1WVdSa0tDZGhjblJwWTJ4bExXUmxkR0ZwYkNjcE8xeHVYRzVjZEZ4MEpHUmxjMk55YVhCMGFXOXVUbTlrWlM1cGJtNWxja2hVVFV3Z1BTQmtaWE5qY21sd2RHbHZianRjYmx4MFhIUWtaR1YwWVdsc1RtOWtaUzVwYm01bGNraFVUVXdnUFNCa1pYUmhhV3c3WEc1Y2JseDBYSFFrWkdWelkzSnBjSFJwYjI1UGRYUmxjaTVoY0hCbGJtUkRhR2xzWkNna1pHVnpZM0pwY0hScGIyNU9iMlJsTENBa1pHVjBZV2xzVG05a1pTazdYRzVjZEZ4MEpITnNhV1JsY2k1aGNIQmxibVJEYUdsc1pDZ2taR1Z6WTNKcGNIUnBiMjVQZFhSbGNpazdYRzVjYmx4MFhIUmpiMjV6ZENBa2RHbDBiR1ZPYjJSbGN5QTlJR1J2WTNWdFpXNTBMbkYxWlhKNVUyVnNaV04wYjNKQmJHd29KeTVoY25ScFkyeGxMV2hsWVdScGJtZGZYM1JwZEd4bEp5azdYRzVjZEZ4MFkyOXVjM1FnSkhScGRHeGxJRDBnSkhScGRHeGxUbTlrWlhOYkpIUnBkR3hsVG05a1pYTXViR1Z1WjNSb0lDMGdNVjA3WEc1Y2JseDBYSFJqYjI1emRDQWtabWx5YzNST2IyUmxjeUE5SUdSdlkzVnRaVzUwTG5GMVpYSjVVMlZzWldOMGIzSkJiR3dvSnk1aGNuUnBZMnhsTFdobFlXUnBibWRmWDI1aGJXVXRMV1pwY25OMEp5azdYRzVjZEZ4MFkyOXVjM1FnSkdacGNuTjBJRDBnSkdacGNuTjBUbTlrWlhOYkpHWnBjbk4wVG05a1pYTXViR1Z1WjNSb0lDMGdNVjA3WEc1Y2JseDBYSFJqYjI1emRDQWtiR0Z6ZEU1dlpHVnpJRDBnWkc5amRXMWxiblF1Y1hWbGNubFRaV3hsWTNSdmNrRnNiQ2duTG1GeWRHbGpiR1V0YUdWaFpHbHVaMTlmYm1GdFpTMHRiR0Z6ZENjcE8xeHVYSFJjZEdOdmJuTjBJQ1JzWVhOMElEMGdKR3hoYzNST2IyUmxjMXNrYkdGemRFNXZaR1Z6TG14bGJtZDBhQ0F0SURGZE8xeHVYRzVjZEZ4MEpIUnBkR3hsTG1sdWJtVnlTRlJOVENBOUlIUnBkR3hsTzF4dVhIUmNkQ1JtYVhKemRDNXBibTVsY2toVVRVd2dQU0JtYVhKemRFNWhiV1U3WEc1Y2RGeDBKR3hoYzNRdWFXNXVaWEpJVkUxTUlEMGdiR0Z6ZEU1aGJXVTdYRzVjYmx4MFhIUmpiMjV6ZENBa1lYSnliM2RPWlhoMElEMGdKSE5zYVdSbGNpNXdZWEpsYm5SRmJHVnRaVzUwTG5GMVpYSjVVMlZzWldOMGIzSW9KeTVoY25KdmR5MXVaWGgwSnlrN1hHNWNkRngwWTI5dWMzUWdKR0Z5Y205M1VISmxkaUE5SUNSemJHbGtaWEl1Y0dGeVpXNTBSV3hsYldWdWRDNXhkV1Z5ZVZObGJHVmpkRzl5S0NjdVlYSnliM2N0Y0hKbGRpY3BPMXh1WEc1Y2RGeDBiR1YwSUdOMWNuSmxiblFnUFNBa2MyeHBaR1Z5TG1acGNuTjBSV3hsYldWdWRFTm9hV3hrTzF4dVhIUmNkQ1JoY25KdmQwNWxlSFF1WVdSa1JYWmxiblJNYVhOMFpXNWxjaWduWTJ4cFkyc25MQ0FvS1NBOVBpQjdYRzVjZEZ4MFhIUmpiMjV6ZENCdVpYaDBJRDBnWTNWeWNtVnVkQzV1WlhoMFJXeGxiV1Z1ZEZOcFlteHBibWM3WEc1Y2RGeDBYSFJwWmlBb2JtVjRkQ2tnZTF4dVhIUmNkRngwWEhSdVpYaDBMbk5qY205c2JFbHVkRzlXYVdWM0tIdGlaV2hoZG1sdmNqb2dYQ0p6Ylc5dmRHaGNJaXdnWW14dlkyczZJRndpYm1WaGNtVnpkRndpTENCcGJteHBibVU2SUZ3aVkyVnVkR1Z5WENKOUtUdGNibHgwWEhSY2RGeDBZM1Z5Y21WdWRDQTlJRzVsZUhRN1hHNWNkRngwWEhSOVhHNWNkRngwZlNrN1hHNWNibHgwWEhRa1lYSnliM2RRY21WMkxtRmtaRVYyWlc1MFRHbHpkR1Z1WlhJb0oyTnNhV05ySnl3Z0tDa2dQVDRnZTF4dVhIUmNkRngwWTI5dWMzUWdjSEpsZGlBOUlHTjFjbkpsYm5RdWNISmxkbWx2ZFhORmJHVnRaVzUwVTJsaWJHbHVaenRjYmx4MFhIUmNkR2xtSUNod2NtVjJLU0I3WEc1Y2RGeDBYSFJjZEhCeVpYWXVjMk55YjJ4c1NXNTBiMVpwWlhjb2UySmxhR0YyYVc5eU9pQmNJbk50YjI5MGFGd2lMQ0JpYkc5amF6b2dYQ0p1WldGeVpYTjBYQ0lzSUdsdWJHbHVaVG9nWENKalpXNTBaWEpjSW4wcE8xeHVYSFJjZEZ4MFhIUmpkWEp5Wlc1MElEMGdjSEpsZGp0Y2JseDBYSFJjZEgxY2JseDBYSFI5S1Z4dVhIUjlLVHRjYmx4dVhIUmhkSFJoWTJoSmJXRm5aVXhwYzNSbGJtVnljeWdwTzF4dVhIUnRZV3RsUVd4d2FHRmlaWFFvS1R0Y2JuMDdYRzVjYmk4dklIUm9hWE1nYm1WbFpITWdkRzhnWW1VZ1lTQmtaV1Z3WlhJZ2MyOXlkRnh1WTI5dWMzUWdjMjl5ZEVKNVZHbDBiR1VnUFNBb0tTQTlQaUI3WEc1Y2RHVnVkSEpwWlhNdVlubFVhWFJzWlM1emIzSjBLQ2hoTENCaUtTQTlQaUI3WEc1Y2RGeDBiR1YwSUdGVWFYUnNaU0E5SUdFdWRHbDBiR1ZiTUYwdWRHOVZjSEJsY2tOaGMyVW9LVHRjYmx4MFhIUnNaWFFnWWxScGRHeGxJRDBnWWk1MGFYUnNaVnN3WFM1MGIxVndjR1Z5UTJGelpTZ3BPMXh1WEhSY2RHbG1JQ2hoVkdsMGJHVWdQaUJpVkdsMGJHVXBJSEpsZEhWeWJpQXhPMXh1WEhSY2RHVnNjMlVnYVdZZ0tHRlVhWFJzWlNBOElHSlVhWFJzWlNrZ2NtVjBkWEp1SUMweE8xeHVYSFJjZEdWc2MyVWdjbVYwZFhKdUlEQTdYRzVjZEgwcE8xeHVmVHRjYmx4dVkyOXVjM1FnYzJWMFJHRjBZU0E5SUNoa1lYUmhLU0E5UGlCN1hHNWNkR1Z1ZEhKcFpYTXVZbmxCZFhSb2IzSWdQU0JrWVhSaE8xeHVYSFJsYm5SeWFXVnpMbUo1VkdsMGJHVWdQU0JrWVhSaExuTnNhV05sS0NrN0lDOHZJR052Y0dsbGN5QmtZWFJoSUdadmNpQmllVlJwZEd4bElITnZjblJjYmx4dVhIUnpiM0owUW5sVWFYUnNaU2dwTzF4dVhIUnlaVzVrWlhKRmJuUnlhV1Z6S0NrN1hHNTlPMXh1WEc1amIyNXpkQ0JtWlhSamFFUmhkR0VnUFNBb0tTQTlQaUI3WEc1Y2RHWmxkR05vS0VSQ0tTNTBhR1Z1S0hKbGN5QTlQaUJ5WlhNdWFuTnZiaWdwS1Z4dVhIUXVkR2hsYmloa1lYUmhJRDArSUh0Y2JseDBYSFJ6WlhSRVlYUmhLR1JoZEdFcE8xeHVYSFJjZEdocFpHVk1iMkZrYVc1bktDazdYRzVjZEgwcFhHNWNkQzVqWVhSamFDaGxjbklnUFQ0Z1kyOXVjMjlzWlM1M1lYSnVLR1Z5Y2lrcE8xeHVmVHRjYmx4dVkyOXVjM1FnYVc1cGRDQTlJQ2dwSUQwK0lIdGNibHgwYzIxdmIzUm9jMk55YjJ4c0xuQnZiSGxtYVd4c0tDazdYRzVjZEdabGRHTm9SR0YwWVNncE8xeHVYSFJ1WVhaTVp5Z3BPMXh1WEhSaFpHUlRiM0owUW5WMGRHOXVUR2x6ZEdWdVpYSnpLQ2s3WEc1Y2RHRjBkR0ZqYUVGeWNtOTNUR2x6ZEdWdVpYSnpLQ2s3WEc1Y2RHRjBkR0ZqYUUxdlpHRnNUR2x6ZEdWdVpYSnpLQ2s3WEc1OVhHNWNibWx1YVhRb0tUdGNiaUlzSW1OdmJuTjBJR0Z5ZEdsamJHVlVaVzF3YkdGMFpTQTlJR0JjYmx4MFBHRnlkR2xqYkdVZ1kyeGhjM005WENKaGNuUnBZMnhsWDE5dmRYUmxjbHdpUGx4dVhIUmNkRHhrYVhZZ1kyeGhjM005WENKaGNuUnBZMnhsWDE5cGJtNWxjbHdpUGx4dVhIUmNkRngwUEdScGRpQmpiR0Z6Y3oxY0ltRnlkR2xqYkdWZlgyaGxZV1JwYm1kY0lqNWNibHgwWEhSY2RGeDBQR0VnWTJ4aGMzTTlYQ0pxY3kxbGJuUnllUzEwYVhSc1pWd2lQand2WVQ1Y2JseDBYSFJjZEZ4MFBHZ3lJR05zWVhOelBWd2lZWEowYVdOc1pTMW9aV0ZrYVc1blgxOTBhWFJzWlZ3aVBqd3ZhREkrWEc1Y2RGeDBYSFJjZER4a2FYWWdZMnhoYzNNOVhDSmhjblJwWTJ4bExXaGxZV1JwYm1kZlgyNWhiV1ZjSWo1Y2JseDBYSFJjZEZ4MFhIUThjM0JoYmlCamJHRnpjejFjSW1GeWRHbGpiR1V0YUdWaFpHbHVaMTlmYm1GdFpTMHRabWx5YzNSY0lqNDhMM053WVc0K1hHNWNkRngwWEhSY2RGeDBQR0VnWTJ4aGMzTTlYQ0pxY3kxbGJuUnllUzFoY25ScGMzUmNJajQ4TDJFK1hHNWNkRngwWEhSY2RGeDBQSE53WVc0Z1kyeGhjM005WENKaGNuUnBZMnhsTFdobFlXUnBibWRmWDI1aGJXVXRMV3hoYzNSY0lqNDhMM053WVc0K1hHNWNkRngwWEhSY2REd3ZaR2wyUGx4dVhIUmNkRngwUEM5a2FYWStYSFJjYmx4MFhIUmNkRHhrYVhZZ1kyeGhjM005WENKaGNuUnBZMnhsWDE5emJHbGtaWEl0YjNWMFpYSmNJajVjYmx4MFhIUmNkRngwUEdScGRpQmpiR0Z6Y3oxY0ltRnlkR2xqYkdWZlgzTnNhV1JsY2kxcGJtNWxjbHdpUGp3dlpHbDJQbHh1WEhSY2RGeDBYSFE4WkdsMklHTnNZWE56UFZ3aVlYSjBhV05zWlY5ZmMyTnliMnhzTFdOdmJuUnliMnh6WENJK1hHNWNkRngwWEhSY2RGeDBQSE53WVc0Z1kyeGhjM005WENKamIyNTBjbTlzY3lCaGNuSnZkeTF3Y21WMlhDSSs0b2FRUEM5emNHRnVQaUJjYmx4MFhIUmNkRngwWEhROGMzQmhiaUJqYkdGemN6MWNJbU52Ym5SeWIyeHpJR0Z5Y205M0xXNWxlSFJjSWo3aWhwSThMM053WVc0K1hHNWNkRngwWEhSY2REd3ZaR2wyUGx4dVhIUmNkRngwWEhROGNDQmpiR0Z6Y3oxY0ltcHpMV0Z5ZEdsamJHVXRZVzVqYUc5eUxYUmhjbWRsZEZ3aVBqd3ZjRDVjYmx4MFhIUThMMlJwZGo1Y2JseDBQQzloY25ScFkyeGxQbHh1WUR0Y2JseHVaWGh3YjNKMElHUmxabUYxYkhRZ1lYSjBhV05zWlZSbGJYQnNZWFJsT3lJc0ltbHRjRzl5ZENCaGNuUnBZMnhsVkdWdGNHeGhkR1VnWm5KdmJTQW5MaTloY25ScFkyeGxKenRjYm1sdGNHOXlkQ0J1WVhaTVp5Qm1jbTl0SUNjdUwyNWhka3huSnp0Y2JseHVaWGh3YjNKMElIc2dZWEowYVdOc1pWUmxiWEJzWVhSbExDQnVZWFpNWnlCOU95SXNJbU52Ym5OMElIUmxiWEJzWVhSbElEMGdYRzVjZEdBOFpHbDJJR05zWVhOelBWd2libUYyWDE5cGJtNWxjbHdpUGx4dVhIUmNkRHhrYVhZZ1kyeGhjM005WENKdVlYWmZYM052Y25RdFlubGNJajVjYmx4MFhIUmNkRHh6Y0dGdUlHTnNZWE56UFZ3aWMyOXlkQzFpZVY5ZmRHbDBiR1ZjSWo1VGIzSjBJR0o1UEM5emNHRnVQbHh1WEhSY2RGeDBQR0oxZEhSdmJpQmpiR0Z6Y3oxY0luTnZjblF0WW5rZ2MyOXlkQzFpZVY5Zllua3RZWEowYVhOMElHRmpkR2wyWlZ3aUlHbGtQVndpYW5NdFlua3RZWEowYVhOMFhDSStRWEowYVhOMFBDOWlkWFIwYjI0K1hHNWNkRngwWEhROGMzQmhiaUJqYkdGemN6MWNJbk52Y25RdFlubGZYMlJwZG1sa1pYSmNJajRnZkNBOEwzTndZVzQrWEc1Y2RGeDBYSFE4WW5WMGRHOXVJR05zWVhOelBWd2ljMjl5ZEMxaWVTQnpiM0owTFdKNVgxOWllUzEwYVhSc1pWd2lJR2xrUFZ3aWFuTXRZbmt0ZEdsMGJHVmNJajVVYVhSc1pUd3ZZblYwZEc5dVBseHVYSFJjZEZ4MFBITndZVzRnWTJ4aGMzTTlYQ0ptYVc1a1hDSWdhV1E5WENKcWN5MW1hVzVrWENJK1hHNWNkRngwWEhSY2RDZzhjM0JoYmlCamJHRnpjejFjSW1acGJtUXRMV2x1Ym1WeVhDSStKaU00T1RnME8wWThMM053WVc0K0tWeHVYSFJjZEZ4MFBDOXpjR0Z1UGx4dVhIUmNkRHd2WkdsMlBseHVYSFJjZER4a2FYWWdZMnhoYzNNOVhDSnVZWFpmWDJGc2NHaGhZbVYwWENJK1hHNWNkRngwWEhROGMzQmhiaUJqYkdGemN6MWNJbUZzY0doaFltVjBYMTkwYVhSc1pWd2lQa2R2SUhSdlBDOXpjR0Z1UGx4dVhIUmNkRngwUEdScGRpQmpiR0Z6Y3oxY0ltRnNjR2hoWW1WMFgxOXNaWFIwWlhKelhDSStQQzlrYVhZK1hHNWNkRngwUEM5a2FYWStYRzVjZER3dlpHbDJQbUE3WEc1Y2JtTnZibk4wSUc1aGRreG5JRDBnS0NrZ1BUNGdlMXh1WEhSc1pYUWdibUYyVDNWMFpYSWdQU0JrYjJOMWJXVnVkQzVuWlhSRmJHVnRaVzUwUW5sSlpDZ25hbk10Ym1GMkp5azdYRzVjZEc1aGRrOTFkR1Z5TG1sdWJtVnlTRlJOVENBOUlIUmxiWEJzWVhSbE8xeHVmVHRjYmx4dVpYaHdiM0owSUdSbFptRjFiSFFnYm1GMlRHYzdJaXdpYVcxd2IzSjBJSHNnUkVJc0lHRnNjR2hoWW1WMExDQWtiRzloWkdsdVp5d2dKRzVoZGl3Z0pIQmhjbUZzYkdGNExDQWtZMjl1ZEdWdWRDd2dKSFJwZEd4bExDQWtZWEp5YjNjc0lDUnRiMlJoYkN3Z0pHeHBaMmgwWW05NExDQWtkbWxsZHlCOUlHWnliMjBnSnk0dUwyTnZibk4wWVc1MGN5YzdYRzVjYm1OdmJuTjBJR1JsWW05MWJtTmxJRDBnS0dadUxDQjBhVzFsS1NBOVBpQjdYRzRnSUd4bGRDQjBhVzFsYjNWME8xeHVYRzRnSUhKbGRIVnliaUJtZFc1amRHbHZiaWdwSUh0Y2JpQWdJQ0JqYjI1emRDQm1kVzVqZEdsdmJrTmhiR3dnUFNBb0tTQTlQaUJtYmk1aGNIQnNlU2gwYUdsekxDQmhjbWQxYldWdWRITXBPMXh1SUNBZ0lGeHVJQ0FnSUdOc1pXRnlWR2x0Wlc5MWRDaDBhVzFsYjNWMEtUdGNiaUFnSUNCMGFXMWxiM1YwSUQwZ2MyVjBWR2x0Wlc5MWRDaG1kVzVqZEdsdmJrTmhiR3dzSUhScGJXVXBPMXh1SUNCOVhHNTlPMXh1WEc1amIyNXpkQ0JvYVdSbFRHOWhaR2x1WnlBOUlDZ3BJRDArSUh0Y2JseDBKR3h2WVdScGJtY3VabTl5UldGamFDaGxiR1Z0SUQwK0lIdGNibHgwWEhSbGJHVnRMbU5zWVhOelRHbHpkQzV5WlcxdmRtVW9KMnh2WVdScGJtY25LVHRjYmx4MFhIUmxiR1Z0TG1Oc1lYTnpUR2x6ZEM1aFpHUW9KM0psWVdSNUp5azdYRzVjZEgwcE8xeHVYSFFrYm1GMkxtTnNZWE56VEdsemRDNWhaR1FvSjNKbFlXUjVKeWs3WEc1OU8xeHVYRzVsZUhCdmNuUWdleUJrWldKdmRXNWpaU3dnYUdsa1pVeHZZV1JwYm1jZ2ZUc2lYWDA9In0=
