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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvc21vb3Roc2Nyb2xsLXBvbHlmaWxsL2Rpc3Qvc21vb3Roc2Nyb2xsLmpzIiwic3JjL2pzL2NvbnN0YW50cy5qcyIsInNyYy9qcy9pbmRleC5qcyIsInNyYy9qcy90ZW1wbGF0ZXMvYXJ0aWNsZS5qcyIsInNyYy9qcy90ZW1wbGF0ZXMvaW5kZXguanMiLCJzcmMvanMvdGVtcGxhdGVzL25hdkxnLmpzIiwic3JjL2pzL3V0aWxzL2luZGV4LmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7OztBQ3ZiQSxJQUFNLEtBQUssK0ZBQVg7QUFDQSxJQUFNLFdBQVcsQ0FBQyxHQUFELEVBQU0sR0FBTixFQUFXLEdBQVgsRUFBZ0IsR0FBaEIsRUFBcUIsR0FBckIsRUFBMEIsR0FBMUIsRUFBK0IsR0FBL0IsRUFBb0MsR0FBcEMsRUFBeUMsR0FBekMsRUFBOEMsR0FBOUMsRUFBbUQsR0FBbkQsRUFBd0QsR0FBeEQsRUFBNkQsR0FBN0QsRUFBa0Us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Y0FBYyxTQUFkLFdBQWMsR0FBTTtBQUN6QixzQkFBUyxPQUFULENBQWlCLGdCQUFRO0FBQ3hCLFNBQUssU0FBTCxDQUFlLE1BQWYsQ0FBc0IsU0FBdEI7QUFDQSxTQUFLLFNBQUwsQ0FBZSxHQUFmLENBQW1CLE9BQW5CO0FBQ0EsR0FIRDtBQUlBLGtCQUFLLFNBQUwsQ0FBZSxHQUFmLENBQW1CLE9BQW5CO0FBQ0EsQ0FORDs7UUFRUyxRLEdBQUEsUTtRQUFVLFcsR0FBQSxXIiwiZmlsZSI6ImJ1bmRsZS5qcyIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbigpe2Z1bmN0aW9uIHIoZSxuLHQpe2Z1bmN0aW9uIG8oaSxmKXtpZighbltpXSl7aWYoIWVbaV0pe3ZhciBjPVwiZnVuY3Rpb25cIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmU7aWYoIWYmJmMpcmV0dXJuIGMoaSwhMCk7aWYodSlyZXR1cm4gdShpLCEwKTt2YXIgYT1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK2krXCInXCIpO3Rocm93IGEuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixhfXZhciBwPW5baV09e2V4cG9ydHM6e319O2VbaV1bMF0uY2FsbChwLmV4cG9ydHMsZnVuY3Rpb24ocil7dmFyIG49ZVtpXVsxXVtyXTtyZXR1cm4gbyhufHxyKX0scCxwLmV4cG9ydHMscixlLG4sdCl9cmV0dXJuIG5baV0uZXhwb3J0c31mb3IodmFyIHU9XCJmdW5jdGlvblwiPT10eXBlb2YgcmVxdWlyZSYmcmVxdWlyZSxpPTA7aTx0Lmxlbmd0aDtpKyspbyh0W2ldKTtyZXR1cm4gb31yZXR1cm4gcn0pKCkiLCIvKiBzbW9vdGhzY3JvbGwgdjAuNC4wIC0gMjAxOCAtIER1c3RhbiBLYXN0ZW4sIEplcmVtaWFzIE1lbmljaGVsbGkgLSBNSVQgTGljZW5zZSAqL1xuKGZ1bmN0aW9uICgpIHtcbiAgJ3VzZSBzdHJpY3QnO1xuXG4gIC8vIHBvbHlmaWxsXG4gIGZ1bmN0aW9uIHBvbHlmaWxsKCkge1xuICAgIC8vIGFsaWFzZXNcbiAgICB2YXIgdyA9IHdpbmRvdztcbiAgICB2YXIgZCA9IGRvY3VtZW50O1xuXG4gICAgLy8gcmV0dXJuIGlmIHNjcm9sbCBiZWhhdmlvciBpcyBzdXBwb3J0ZWQgYW5kIHBvbHlmaWxsIGlzIG5vdCBmb3JjZWRcbiAgICBpZiAoXG4gICAgICAnc2Nyb2xsQmVoYXZpb3InIGluIGQuZG9jdW1lbnRFbGVtZW50LnN0eWxlICYmXG4gICAgICB3Ll9fZm9yY2VTbW9vdGhTY3JvbGxQb2x5ZmlsbF9fICE9PSB0cnVlXG4gICAgKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgLy8gZ2xvYmFsc1xuICAgIHZhciBFbGVtZW50ID0gdy5IVE1MRWxlbWVudCB8fCB3LkVsZW1lbnQ7XG4gICAgdmFyIFNDUk9MTF9USU1FID0gNDY4O1xuXG4gICAgLy8gb2JqZWN0IGdhdGhlcmluZyBvcmlnaW5hbCBzY3JvbGwgbWV0aG9kc1xuICAgIHZhciBvcmlnaW5hbCA9IHtcbiAgICAgIHNjcm9sbDogdy5zY3JvbGwgfHwgdy5zY3JvbGxUbyxcbiAgICAgIHNjcm9sbEJ5OiB3LnNjcm9sbEJ5LFxuICAgICAgZWxlbWVudFNjcm9sbDogRWxlbWVudC5wcm90b3R5cGUuc2Nyb2xsIHx8IHNjcm9sbEVsZW1lbnQsXG4gICAgICBzY3JvbGxJbnRvVmlldzogRWxlbWVudC5wcm90b3R5cGUuc2Nyb2xsSW50b1ZpZXdcbiAgICB9O1xuXG4gICAgLy8gZGVmaW5lIHRpbWluZyBtZXRob2RcbiAgICB2YXIgbm93ID1cbiAgICAgIHcucGVyZm9ybWFuY2UgJiYgdy5wZXJmb3JtYW5jZS5ub3dcbiAgICAgICAgPyB3LnBlcmZvcm1hbmNlLm5vdy5iaW5kKHcucGVyZm9ybWFuY2UpXG4gICAgICAgIDogRGF0ZS5ub3c7XG5cbiAgICAvKipcbiAgICAgKiBpbmRpY2F0ZXMgaWYgYSB0aGUgY3VycmVudCBicm93c2VyIGlzIG1hZGUgYnkgTWljcm9zb2Z0XG4gICAgICogQG1ldGhvZCBpc01pY3Jvc29mdEJyb3dzZXJcbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gdXNlckFnZW50XG4gICAgICogQHJldHVybnMge0Jvb2xlYW59XG4gICAgICovXG4gICAgZnVuY3Rpb24gaXNNaWNyb3NvZnRCcm93c2VyKHVzZXJBZ2VudCkge1xuICAgICAgdmFyIHVzZXJBZ2VudFBhdHRlcm5zID0gWydNU0lFICcsICdUcmlkZW50LycsICdFZGdlLyddO1xuXG4gICAgICByZXR1cm4gbmV3IFJlZ0V4cCh1c2VyQWdlbnRQYXR0ZXJucy5qb2luKCd8JykpLnRlc3QodXNlckFnZW50KTtcbiAgICB9XG5cbiAgICAvKlxuICAgICAqIElFIGhhcyByb3VuZGluZyBidWcgcm91bmRpbmcgZG93biBjbGllbnRIZWlnaHQgYW5kIGNsaWVudFdpZHRoIGFuZFxuICAgICAqIHJvdW5kaW5nIHVwIHNjcm9sbEhlaWdodCBhbmQgc2Nyb2xsV2lkdGggY2F1c2luZyBmYWxzZSBwb3NpdGl2ZXNcbiAgICAgKiBvbiBoYXNTY3JvbGxhYmxlU3BhY2VcbiAgICAgKi9cbiAgICB2YXIgUk9VTkRJTkdfVE9MRVJBTkNFID0gaXNNaWNyb3NvZnRCcm93c2VyKHcubmF2aWdhdG9yLnVzZXJBZ2VudCkgPyAxIDogMDtcblxuICAgIC8qKlxuICAgICAqIGNoYW5nZXMgc2Nyb2xsIHBvc2l0aW9uIGluc2lkZSBhbiBlbGVtZW50XG4gICAgICogQG1ldGhvZCBzY3JvbGxFbGVtZW50XG4gICAgICogQHBhcmFtIHtOdW1iZXJ9IHhcbiAgICAgKiBAcGFyYW0ge051bWJlcn0geVxuICAgICAqIEByZXR1cm5zIHt1bmRlZmluZWR9XG4gICAgICovXG4gICAgZnVuY3Rpb24gc2Nyb2xsRWxlbWVudCh4LCB5KSB7XG4gICAgICB0aGlzLnNjcm9sbExlZnQgPSB4O1xuICAgICAgdGhpcy5zY3JvbGxUb3AgPSB5O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIHJldHVybnMgcmVzdWx0IG9mIGFwcGx5aW5nIGVhc2UgbWF0aCBmdW5jdGlvbiB0byBhIG51bWJlclxuICAgICAqIEBtZXRob2QgZWFzZVxuICAgICAqIEBwYXJhbSB7TnVtYmVyfSBrXG4gICAgICogQHJldHVybnMge051bWJlcn1cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBlYXNlKGspIHtcbiAgICAgIHJldHVybiAwLjUgKiAoMSAtIE1hdGguY29zKE1hdGguUEkgKiBrKSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogaW5kaWNhdGVzIGlmIGEgc21vb3RoIGJlaGF2aW9yIHNob3VsZCBiZSBhcHBsaWVkXG4gICAgICogQG1ldGhvZCBzaG91bGRCYWlsT3V0XG4gICAgICogQHBhcmFtIHtOdW1iZXJ8T2JqZWN0fSBmaXJzdEFyZ1xuICAgICAqIEByZXR1cm5zIHtCb29sZWFufVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIHNob3VsZEJhaWxPdXQoZmlyc3RBcmcpIHtcbiAgICAgIGlmIChcbiAgICAgICAgZmlyc3RBcmcgPT09IG51bGwgfHxcbiAgICAgICAgdHlwZW9mIGZpcnN0QXJnICE9PSAnb2JqZWN0JyB8fFxuICAgICAgICBmaXJzdEFyZy5iZWhhdmlvciA9PT0gdW5kZWZpbmVkIHx8XG4gICAgICAgIGZpcnN0QXJnLmJlaGF2aW9yID09PSAnYXV0bycgfHxcbiAgICAgICAgZmlyc3RBcmcuYmVoYXZpb3IgPT09ICdpbnN0YW50J1xuICAgICAgKSB7XG4gICAgICAgIC8vIGZpcnN0IGFyZ3VtZW50IGlzIG5vdCBhbiBvYmplY3QvbnVsbFxuICAgICAgICAvLyBvciBiZWhhdmlvciBpcyBhdXRvLCBpbnN0YW50IG9yIHVuZGVmaW5lZFxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH1cblxuICAgICAgaWYgKHR5cGVvZiBmaXJzdEFyZyA9PT0gJ29iamVjdCcgJiYgZmlyc3RBcmcuYmVoYXZpb3IgPT09ICdzbW9vdGgnKSB7XG4gICAgICAgIC8vIGZpcnN0IGFyZ3VtZW50IGlzIGFuIG9iamVjdCBhbmQgYmVoYXZpb3IgaXMgc21vb3RoXG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cblxuICAgICAgLy8gdGhyb3cgZXJyb3Igd2hlbiBiZWhhdmlvciBpcyBub3Qgc3VwcG9ydGVkXG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFxuICAgICAgICAnYmVoYXZpb3IgbWVtYmVyIG9mIFNjcm9sbE9wdGlvbnMgJyArXG4gICAgICAgICAgZmlyc3RBcmcuYmVoYXZpb3IgK1xuICAgICAgICAgICcgaXMgbm90IGEgdmFsaWQgdmFsdWUgZm9yIGVudW1lcmF0aW9uIFNjcm9sbEJlaGF2aW9yLidcbiAgICAgICk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogaW5kaWNhdGVzIGlmIGFuIGVsZW1lbnQgaGFzIHNjcm9sbGFibGUgc3BhY2UgaW4gdGhlIHByb3ZpZGVkIGF4aXNcbiAgICAgKiBAbWV0aG9kIGhhc1Njcm9sbGFibGVTcGFjZVxuICAgICAqIEBwYXJhbSB7Tm9kZX0gZWxcbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gYXhpc1xuICAgICAqIEByZXR1cm5zIHtCb29sZWFufVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGhhc1Njcm9sbGFibGVTcGFjZShlbCwgYXhpcykge1xuICAgICAgaWYgKGF4aXMgPT09ICdZJykge1xuICAgICAgICByZXR1cm4gZWwuY2xpZW50SGVpZ2h0ICsgUk9VTkRJTkdfVE9MRVJBTkNFIDwgZWwuc2Nyb2xsSGVpZ2h0O1xuICAgICAgfVxuXG4gICAgICBpZiAoYXhpcyA9PT0gJ1gnKSB7XG4gICAgICAgIHJldHVybiBlbC5jbGllbnRXaWR0aCArIFJPVU5ESU5HX1RPTEVSQU5DRSA8IGVsLnNjcm9sbFdpZHRoO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIGluZGljYXRlcyBpZiBhbiBlbGVtZW50IGhhcyBhIHNjcm9sbGFibGUgb3ZlcmZsb3cgcHJvcGVydHkgaW4gdGhlIGF4aXNcbiAgICAgKiBAbWV0aG9kIGNhbk92ZXJmbG93XG4gICAgICogQHBhcmFtIHtOb2RlfSBlbFxuICAgICAqIEBwYXJhbSB7U3RyaW5nfSBheGlzXG4gICAgICogQHJldHVybnMge0Jvb2xlYW59XG4gICAgICovXG4gICAgZnVuY3Rpb24gY2FuT3ZlcmZsb3coZWwsIGF4aXMpIHtcbiAgICAgIHZhciBvdmVyZmxvd1ZhbHVlID0gdy5nZXRDb21wdXRlZFN0eWxlKGVsLCBudWxsKVsnb3ZlcmZsb3cnICsgYXhpc107XG5cbiAgICAgIHJldHVybiBvdmVyZmxvd1ZhbHVlID09PSAnYXV0bycgfHwgb3ZlcmZsb3dWYWx1ZSA9PT0gJ3Njcm9sbCc7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogaW5kaWNhdGVzIGlmIGFuIGVsZW1lbnQgY2FuIGJlIHNjcm9sbGVkIGluIGVpdGhlciBheGlzXG4gICAgICogQG1ldGhvZCBpc1Njcm9sbGFibGVcbiAgICAgKiBAcGFyYW0ge05vZGV9IGVsXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IGF4aXNcbiAgICAgKiBAcmV0dXJucyB7Qm9vbGVhbn1cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBpc1Njcm9sbGFibGUoZWwpIHtcbiAgICAgIHZhciBpc1Njcm9sbGFibGVZID0gaGFzU2Nyb2xsYWJsZVNwYWNlKGVsLCAnWScpICYmIGNhbk92ZXJmbG93KGVsLCAnWScpO1xuICAgICAgdmFyIGlzU2Nyb2xsYWJsZVggPSBoYXNTY3JvbGxhYmxlU3BhY2UoZWwsICdYJykgJiYgY2FuT3ZlcmZsb3coZWwsICdYJyk7XG5cbiAgICAgIHJldHVybiBpc1Njcm9sbGFibGVZIHx8IGlzU2Nyb2xsYWJsZVg7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogZmluZHMgc2Nyb2xsYWJsZSBwYXJlbnQgb2YgYW4gZWxlbWVudFxuICAgICAqIEBtZXRob2QgZmluZFNjcm9sbGFibGVQYXJlbnRcbiAgICAgKiBAcGFyYW0ge05vZGV9IGVsXG4gICAgICogQHJldHVybnMge05vZGV9IGVsXG4gICAgICovXG4gICAgZnVuY3Rpb24gZmluZFNjcm9sbGFibGVQYXJlbnQoZWwpIHtcbiAgICAgIHZhciBpc0JvZHk7XG5cbiAgICAgIGRvIHtcbiAgICAgICAgZWwgPSBlbC5wYXJlbnROb2RlO1xuXG4gICAgICAgIGlzQm9keSA9IGVsID09PSBkLmJvZHk7XG4gICAgICB9IHdoaWxlIChpc0JvZHkgPT09IGZhbHNlICYmIGlzU2Nyb2xsYWJsZShlbCkgPT09IGZhbHNlKTtcblxuICAgICAgaXNCb2R5ID0gbnVsbDtcblxuICAgICAgcmV0dXJuIGVsO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIHNlbGYgaW52b2tlZCBmdW5jdGlvbiB0aGF0LCBnaXZlbiBhIGNvbnRleHQsIHN0ZXBzIHRocm91Z2ggc2Nyb2xsaW5nXG4gICAgICogQG1ldGhvZCBzdGVwXG4gICAgICogQHBhcmFtIHtPYmplY3R9IGNvbnRleHRcbiAgICAgKiBAcmV0dXJucyB7dW5kZWZpbmVkfVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIHN0ZXAoY29udGV4dCkge1xuICAgICAgdmFyIHRpbWUgPSBub3coKTtcbiAgICAgIHZhciB2YWx1ZTtcbiAgICAgIHZhciBjdXJyZW50WDtcbiAgICAgIHZhciBjdXJyZW50WTtcbiAgICAgIHZhciBlbGFwc2VkID0gKHRpbWUgLSBjb250ZXh0LnN0YXJ0VGltZSkgLyBTQ1JPTExfVElNRTtcblxuICAgICAgLy8gYXZvaWQgZWxhcHNlZCB0aW1lcyBoaWdoZXIgdGhhbiBvbmVcbiAgICAgIGVsYXBzZWQgPSBlbGFwc2VkID4gMSA/IDEgOiBlbGFwc2VkO1xuXG4gICAgICAvLyBhcHBseSBlYXNpbmcgdG8gZWxhcHNlZCB0aW1lXG4gICAgICB2YWx1ZSA9IGVhc2UoZWxhcHNlZCk7XG5cbiAgICAgIGN1cnJlbnRYID0gY29udGV4dC5zdGFydFggKyAoY29udGV4dC54IC0gY29udGV4dC5zdGFydFgpICogdmFsdWU7XG4gICAgICBjdXJyZW50WSA9IGNvbnRleHQuc3RhcnRZICsgKGNvbnRleHQueSAtIGNvbnRleHQuc3RhcnRZKSAqIHZhbHVlO1xuXG4gICAgICBjb250ZXh0Lm1ldGhvZC5jYWxsKGNvbnRleHQuc2Nyb2xsYWJsZSwgY3VycmVudFgsIGN1cnJlbnRZKTtcblxuICAgICAgLy8gc2Nyb2xsIG1vcmUgaWYgd2UgaGF2ZSBub3QgcmVhY2hlZCBvdXIgZGVzdGluYXRpb25cbiAgICAgIGlmIChjdXJyZW50WCAhPT0gY29udGV4dC54IHx8IGN1cnJlbnRZICE9PSBjb250ZXh0LnkpIHtcbiAgICAgICAgdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUoc3RlcC5iaW5kKHcsIGNvbnRleHQpKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBzY3JvbGxzIHdpbmRvdyBvciBlbGVtZW50IHdpdGggYSBzbW9vdGggYmVoYXZpb3JcbiAgICAgKiBAbWV0aG9kIHNtb290aFNjcm9sbFxuICAgICAqIEBwYXJhbSB7T2JqZWN0fE5vZGV9IGVsXG4gICAgICogQHBhcmFtIHtOdW1iZXJ9IHhcbiAgICAgKiBAcGFyYW0ge051bWJlcn0geVxuICAgICAqIEByZXR1cm5zIHt1bmRlZmluZWR9XG4gICAgICovXG4gICAgZnVuY3Rpb24gc21vb3RoU2Nyb2xsKGVsLCB4LCB5KSB7XG4gICAgICB2YXIgc2Nyb2xsYWJsZTtcbiAgICAgIHZhciBzdGFydFg7XG4gICAgICB2YXIgc3RhcnRZO1xuICAgICAgdmFyIG1ldGhvZDtcbiAgICAgIHZhciBzdGFydFRpbWUgPSBub3coKTtcblxuICAgICAgLy8gZGVmaW5lIHNjcm9sbCBjb250ZXh0XG4gICAgICBpZiAoZWwgPT09IGQuYm9keSkge1xuICAgICAgICBzY3JvbGxhYmxlID0gdztcbiAgICAgICAgc3RhcnRYID0gdy5zY3JvbGxYIHx8IHcucGFnZVhPZmZzZXQ7XG4gICAgICAgIHN0YXJ0WSA9IHcuc2Nyb2xsWSB8fCB3LnBhZ2VZT2Zmc2V0O1xuICAgICAgICBtZXRob2QgPSBvcmlnaW5hbC5zY3JvbGw7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBzY3JvbGxhYmxlID0gZWw7XG4gICAgICAgIHN0YXJ0WCA9IGVsLnNjcm9sbExlZnQ7XG4gICAgICAgIHN0YXJ0WSA9IGVsLnNjcm9sbFRvcDtcbiAgICAgICAgbWV0aG9kID0gc2Nyb2xsRWxlbWVudDtcbiAgICAgIH1cblxuICAgICAgLy8gc2Nyb2xsIGxvb3Bpbmcgb3ZlciBhIGZyYW1lXG4gICAgICBzdGVwKHtcbiAgICAgICAgc2Nyb2xsYWJsZTogc2Nyb2xsYWJsZSxcbiAgICAgICAgbWV0aG9kOiBtZXRob2QsXG4gICAgICAgIHN0YXJ0VGltZTogc3RhcnRUaW1lLFxuICAgICAgICBzdGFydFg6IHN0YXJ0WCxcbiAgICAgICAgc3RhcnRZOiBzdGFydFksXG4gICAgICAgIHg6IHgsXG4gICAgICAgIHk6IHlcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIC8vIE9SSUdJTkFMIE1FVEhPRFMgT1ZFUlJJREVTXG4gICAgLy8gdy5zY3JvbGwgYW5kIHcuc2Nyb2xsVG9cbiAgICB3LnNjcm9sbCA9IHcuc2Nyb2xsVG8gPSBmdW5jdGlvbigpIHtcbiAgICAgIC8vIGF2b2lkIGFjdGlvbiB3aGVuIG5vIGFyZ3VtZW50cyBhcmUgcGFzc2VkXG4gICAgICBpZiAoYXJndW1lbnRzWzBdID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICAvLyBhdm9pZCBzbW9vdGggYmVoYXZpb3IgaWYgbm90IHJlcXVpcmVkXG4gICAgICBpZiAoc2hvdWxkQmFpbE91dChhcmd1bWVudHNbMF0pID09PSB0cnVlKSB7XG4gICAgICAgIG9yaWdpbmFsLnNjcm9sbC5jYWxsKFxuICAgICAgICAgIHcsXG4gICAgICAgICAgYXJndW1lbnRzWzBdLmxlZnQgIT09IHVuZGVmaW5lZFxuICAgICAgICAgICAgPyBhcmd1bWVudHNbMF0ubGVmdFxuICAgICAgICAgICAgOiB0eXBlb2YgYXJndW1lbnRzWzBdICE9PSAnb2JqZWN0J1xuICAgICAgICAgICAgICA/IGFyZ3VtZW50c1swXVxuICAgICAgICAgICAgICA6IHcuc2Nyb2xsWCB8fCB3LnBhZ2VYT2Zmc2V0LFxuICAgICAgICAgIC8vIHVzZSB0b3AgcHJvcCwgc2Vjb25kIGFyZ3VtZW50IGlmIHByZXNlbnQgb3IgZmFsbGJhY2sgdG8gc2Nyb2xsWVxuICAgICAgICAgIGFyZ3VtZW50c1swXS50b3AgIT09IHVuZGVmaW5lZFxuICAgICAgICAgICAgPyBhcmd1bWVudHNbMF0udG9wXG4gICAgICAgICAgICA6IGFyZ3VtZW50c1sxXSAhPT0gdW5kZWZpbmVkXG4gICAgICAgICAgICAgID8gYXJndW1lbnRzWzFdXG4gICAgICAgICAgICAgIDogdy5zY3JvbGxZIHx8IHcucGFnZVlPZmZzZXRcbiAgICAgICAgKTtcblxuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIC8vIExFVCBUSEUgU01PT1RITkVTUyBCRUdJTiFcbiAgICAgIHNtb290aFNjcm9sbC5jYWxsKFxuICAgICAgICB3LFxuICAgICAgICBkLmJvZHksXG4gICAgICAgIGFyZ3VtZW50c1swXS5sZWZ0ICE9PSB1bmRlZmluZWRcbiAgICAgICAgICA/IH5+YXJndW1lbnRzWzBdLmxlZnRcbiAgICAgICAgICA6IHcuc2Nyb2xsWCB8fCB3LnBhZ2VYT2Zmc2V0LFxuICAgICAgICBhcmd1bWVudHNbMF0udG9wICE9PSB1bmRlZmluZWRcbiAgICAgICAgICA/IH5+YXJndW1lbnRzWzBdLnRvcFxuICAgICAgICAgIDogdy5zY3JvbGxZIHx8IHcucGFnZVlPZmZzZXRcbiAgICAgICk7XG4gICAgfTtcblxuICAgIC8vIHcuc2Nyb2xsQnlcbiAgICB3LnNjcm9sbEJ5ID0gZnVuY3Rpb24oKSB7XG4gICAgICAvLyBhdm9pZCBhY3Rpb24gd2hlbiBubyBhcmd1bWVudHMgYXJlIHBhc3NlZFxuICAgICAgaWYgKGFyZ3VtZW50c1swXSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgLy8gYXZvaWQgc21vb3RoIGJlaGF2aW9yIGlmIG5vdCByZXF1aXJlZFxuICAgICAgaWYgKHNob3VsZEJhaWxPdXQoYXJndW1lbnRzWzBdKSkge1xuICAgICAgICBvcmlnaW5hbC5zY3JvbGxCeS5jYWxsKFxuICAgICAgICAgIHcsXG4gICAgICAgICAgYXJndW1lbnRzWzBdLmxlZnQgIT09IHVuZGVmaW5lZFxuICAgICAgICAgICAgPyBhcmd1bWVudHNbMF0ubGVmdFxuICAgICAgICAgICAgOiB0eXBlb2YgYXJndW1lbnRzWzBdICE9PSAnb2JqZWN0JyA/IGFyZ3VtZW50c1swXSA6IDAsXG4gICAgICAgICAgYXJndW1lbnRzWzBdLnRvcCAhPT0gdW5kZWZpbmVkXG4gICAgICAgICAgICA/IGFyZ3VtZW50c1swXS50b3BcbiAgICAgICAgICAgIDogYXJndW1lbnRzWzFdICE9PSB1bmRlZmluZWQgPyBhcmd1bWVudHNbMV0gOiAwXG4gICAgICAgICk7XG5cbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICAvLyBMRVQgVEhFIFNNT09USE5FU1MgQkVHSU4hXG4gICAgICBzbW9vdGhTY3JvbGwuY2FsbChcbiAgICAgICAgdyxcbiAgICAgICAgZC5ib2R5LFxuICAgICAgICB+fmFyZ3VtZW50c1swXS5sZWZ0ICsgKHcuc2Nyb2xsWCB8fCB3LnBhZ2VYT2Zmc2V0KSxcbiAgICAgICAgfn5hcmd1bWVudHNbMF0udG9wICsgKHcuc2Nyb2xsWSB8fCB3LnBhZ2VZT2Zmc2V0KVxuICAgICAgKTtcbiAgICB9O1xuXG4gICAgLy8gRWxlbWVudC5wcm90b3R5cGUuc2Nyb2xsIGFuZCBFbGVtZW50LnByb3RvdHlwZS5zY3JvbGxUb1xuICAgIEVsZW1lbnQucHJvdG90eXBlLnNjcm9sbCA9IEVsZW1lbnQucHJvdG90eXBlLnNjcm9sbFRvID0gZnVuY3Rpb24oKSB7XG4gICAgICAvLyBhdm9pZCBhY3Rpb24gd2hlbiBubyBhcmd1bWVudHMgYXJlIHBhc3NlZFxuICAgICAgaWYgKGFyZ3VtZW50c1swXSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgLy8gYXZvaWQgc21vb3RoIGJlaGF2aW9yIGlmIG5vdCByZXF1aXJlZFxuICAgICAgaWYgKHNob3VsZEJhaWxPdXQoYXJndW1lbnRzWzBdKSA9PT0gdHJ1ZSkge1xuICAgICAgICAvLyBpZiBvbmUgbnVtYmVyIGlzIHBhc3NlZCwgdGhyb3cgZXJyb3IgdG8gbWF0Y2ggRmlyZWZveCBpbXBsZW1lbnRhdGlvblxuICAgICAgICBpZiAodHlwZW9mIGFyZ3VtZW50c1swXSA9PT0gJ251bWJlcicgJiYgYXJndW1lbnRzWzFdID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgU3ludGF4RXJyb3IoJ1ZhbHVlIGNvdWxkIG5vdCBiZSBjb252ZXJ0ZWQnKTtcbiAgICAgICAgfVxuXG4gICAgICAgIG9yaWdpbmFsLmVsZW1lbnRTY3JvbGwuY2FsbChcbiAgICAgICAgICB0aGlzLFxuICAgICAgICAgIC8vIHVzZSBsZWZ0IHByb3AsIGZpcnN0IG51bWJlciBhcmd1bWVudCBvciBmYWxsYmFjayB0byBzY3JvbGxMZWZ0XG4gICAgICAgICAgYXJndW1lbnRzWzBdLmxlZnQgIT09IHVuZGVmaW5lZFxuICAgICAgICAgICAgPyB+fmFyZ3VtZW50c1swXS5sZWZ0XG4gICAgICAgICAgICA6IHR5cGVvZiBhcmd1bWVudHNbMF0gIT09ICdvYmplY3QnID8gfn5hcmd1bWVudHNbMF0gOiB0aGlzLnNjcm9sbExlZnQsXG4gICAgICAgICAgLy8gdXNlIHRvcCBwcm9wLCBzZWNvbmQgYXJndW1lbnQgb3IgZmFsbGJhY2sgdG8gc2Nyb2xsVG9wXG4gICAgICAgICAgYXJndW1lbnRzWzBdLnRvcCAhPT0gdW5kZWZpbmVkXG4gICAgICAgICAgICA/IH5+YXJndW1lbnRzWzBdLnRvcFxuICAgICAgICAgICAgOiBhcmd1bWVudHNbMV0gIT09IHVuZGVmaW5lZCA/IH5+YXJndW1lbnRzWzFdIDogdGhpcy5zY3JvbGxUb3BcbiAgICAgICAgKTtcblxuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIHZhciBsZWZ0ID0gYXJndW1lbnRzWzBdLmxlZnQ7XG4gICAgICB2YXIgdG9wID0gYXJndW1lbnRzWzBdLnRvcDtcblxuICAgICAgLy8gTEVUIFRIRSBTTU9PVEhORVNTIEJFR0lOIVxuICAgICAgc21vb3RoU2Nyb2xsLmNhbGwoXG4gICAgICAgIHRoaXMsXG4gICAgICAgIHRoaXMsXG4gICAgICAgIHR5cGVvZiBsZWZ0ID09PSAndW5kZWZpbmVkJyA/IHRoaXMuc2Nyb2xsTGVmdCA6IH5+bGVmdCxcbiAgICAgICAgdHlwZW9mIHRvcCA9PT0gJ3VuZGVmaW5lZCcgPyB0aGlzLnNjcm9sbFRvcCA6IH5+dG9wXG4gICAgICApO1xuICAgIH07XG5cbiAgICAvLyBFbGVtZW50LnByb3RvdHlwZS5zY3JvbGxCeVxuICAgIEVsZW1lbnQucHJvdG90eXBlLnNjcm9sbEJ5ID0gZnVuY3Rpb24oKSB7XG4gICAgICAvLyBhdm9pZCBhY3Rpb24gd2hlbiBubyBhcmd1bWVudHMgYXJlIHBhc3NlZFxuICAgICAgaWYgKGFyZ3VtZW50c1swXSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgLy8gYXZvaWQgc21vb3RoIGJlaGF2aW9yIGlmIG5vdCByZXF1aXJlZFxuICAgICAgaWYgKHNob3VsZEJhaWxPdXQoYXJndW1lbnRzWzBdKSA9PT0gdHJ1ZSkge1xuICAgICAgICBvcmlnaW5hbC5lbGVtZW50U2Nyb2xsLmNhbGwoXG4gICAgICAgICAgdGhpcyxcbiAgICAgICAgICBhcmd1bWVudHNbMF0ubGVmdCAhPT0gdW5kZWZpbmVkXG4gICAgICAgICAgICA/IH5+YXJndW1lbnRzWzBdLmxlZnQgKyB0aGlzLnNjcm9sbExlZnRcbiAgICAgICAgICAgIDogfn5hcmd1bWVudHNbMF0gKyB0aGlzLnNjcm9sbExlZnQsXG4gICAgICAgICAgYXJndW1lbnRzWzBdLnRvcCAhPT0gdW5kZWZpbmVkXG4gICAgICAgICAgICA/IH5+YXJndW1lbnRzWzBdLnRvcCArIHRoaXMuc2Nyb2xsVG9wXG4gICAgICAgICAgICA6IH5+YXJndW1lbnRzWzFdICsgdGhpcy5zY3JvbGxUb3BcbiAgICAgICAgKTtcblxuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIHRoaXMuc2Nyb2xsKHtcbiAgICAgICAgbGVmdDogfn5hcmd1bWVudHNbMF0ubGVmdCArIHRoaXMuc2Nyb2xsTGVmdCxcbiAgICAgICAgdG9wOiB+fmFyZ3VtZW50c1swXS50b3AgKyB0aGlzLnNjcm9sbFRvcCxcbiAgICAgICAgYmVoYXZpb3I6IGFyZ3VtZW50c1swXS5iZWhhdmlvclxuICAgICAgfSk7XG4gICAgfTtcblxuICAgIC8vIEVsZW1lbnQucHJvdG90eXBlLnNjcm9sbEludG9WaWV3XG4gICAgRWxlbWVudC5wcm90b3R5cGUuc2Nyb2xsSW50b1ZpZXcgPSBmdW5jdGlvbigpIHtcbiAgICAgIC8vIGF2b2lkIHNtb290aCBiZWhhdmlvciBpZiBub3QgcmVxdWlyZWRcbiAgICAgIGlmIChzaG91bGRCYWlsT3V0KGFyZ3VtZW50c1swXSkgPT09IHRydWUpIHtcbiAgICAgICAgb3JpZ2luYWwuc2Nyb2xsSW50b1ZpZXcuY2FsbChcbiAgICAgICAgICB0aGlzLFxuICAgICAgICAgIGFyZ3VtZW50c1swXSA9PT0gdW5kZWZpbmVkID8gdHJ1ZSA6IGFyZ3VtZW50c1swXVxuICAgICAgICApO1xuXG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgLy8gTEVUIFRIRSBTTU9PVEhORVNTIEJFR0lOIVxuICAgICAgdmFyIHNjcm9sbGFibGVQYXJlbnQgPSBmaW5kU2Nyb2xsYWJsZVBhcmVudCh0aGlzKTtcbiAgICAgIHZhciBwYXJlbnRSZWN0cyA9IHNjcm9sbGFibGVQYXJlbnQuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG4gICAgICB2YXIgY2xpZW50UmVjdHMgPSB0aGlzLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xuXG4gICAgICBpZiAoc2Nyb2xsYWJsZVBhcmVudCAhPT0gZC5ib2R5KSB7XG4gICAgICAgIC8vIHJldmVhbCBlbGVtZW50IGluc2lkZSBwYXJlbnRcbiAgICAgICAgc21vb3RoU2Nyb2xsLmNhbGwoXG4gICAgICAgICAgdGhpcyxcbiAgICAgICAgICBzY3JvbGxhYmxlUGFyZW50LFxuICAgICAgICAgIHNjcm9sbGFibGVQYXJlbnQuc2Nyb2xsTGVmdCArIGNsaWVudFJlY3RzLmxlZnQgLSBwYXJlbnRSZWN0cy5sZWZ0LFxuICAgICAgICAgIHNjcm9sbGFibGVQYXJlbnQuc2Nyb2xsVG9wICsgY2xpZW50UmVjdHMudG9wIC0gcGFyZW50UmVjdHMudG9wXG4gICAgICAgICk7XG5cbiAgICAgICAgLy8gcmV2ZWFsIHBhcmVudCBpbiB2aWV3cG9ydCB1bmxlc3MgaXMgZml4ZWRcbiAgICAgICAgaWYgKHcuZ2V0Q29tcHV0ZWRTdHlsZShzY3JvbGxhYmxlUGFyZW50KS5wb3NpdGlvbiAhPT0gJ2ZpeGVkJykge1xuICAgICAgICAgIHcuc2Nyb2xsQnkoe1xuICAgICAgICAgICAgbGVmdDogcGFyZW50UmVjdHMubGVmdCxcbiAgICAgICAgICAgIHRvcDogcGFyZW50UmVjdHMudG9wLFxuICAgICAgICAgICAgYmVoYXZpb3I6ICdzbW9vdGgnXG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIHJldmVhbCBlbGVtZW50IGluIHZpZXdwb3J0XG4gICAgICAgIHcuc2Nyb2xsQnkoe1xuICAgICAgICAgIGxlZnQ6IGNsaWVudFJlY3RzLmxlZnQsXG4gICAgICAgICAgdG9wOiBjbGllbnRSZWN0cy50b3AsXG4gICAgICAgICAgYmVoYXZpb3I6ICdzbW9vdGgnXG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH07XG4gIH1cblxuICBpZiAodHlwZW9mIGV4cG9ydHMgPT09ICdvYmplY3QnICYmIHR5cGVvZiBtb2R1bGUgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgLy8gY29tbW9uanNcbiAgICBtb2R1bGUuZXhwb3J0cyA9IHsgcG9seWZpbGw6IHBvbHlmaWxsIH07XG4gIH0gZWxzZSB7XG4gICAgLy8gZ2xvYmFsXG4gICAgcG9seWZpbGwoKTtcbiAgfVxuXG59KCkpO1xuIiwiY29uc3QgREIgPSAnaHR0cHM6Ly9uZXh1cy1jYXRhbG9nLmZpcmViYXNlaW8uY29tL3Bvc3RzLmpzb24/YXV0aD03ZzdweUtLeWtOM041ZXdySW1oT2FTNnZ3ckZzYzVmS2tyazhlanpmJztcbmNvbnN0IGFscGhhYmV0ID0gWydhJywgJ2InLCAnYycsICdkJywgJ2UnLCAnZicsICdnJywgJ2gnLCAnaScsICdqJywgJ2snLCAnbCcsICdtJywgJ24nLCAnbycsICdwJywgJ3InLCAncycsICd0JywgJ3UnLCAndicsICd3JywgJ3knLCAneiddO1xuXG5jb25zdCAkbG9hZGluZyA9IEFycmF5LmZyb20oZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbCgnLmxvYWRpbmcnKSk7XG5jb25zdCAkbmF2ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2pzLW5hdicpO1xuY29uc3QgJHBhcmFsbGF4ID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignLnBhcmFsbGF4Jyk7XG5jb25zdCAkY29udGVudCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJy5jb250ZW50Jyk7XG5jb25zdCAkdGl0bGUgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnanMtdGl0bGUnKTtcbmNvbnN0ICRhcnJvdyA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJy5hcnJvdycpO1xuY29uc3QgJG1vZGFsID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignLm1vZGFsJyk7XG5jb25zdCAkbGlnaHRib3ggPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcubGlnaHRib3gnKTtcbmNvbnN0ICR2aWV3ID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignLmxpZ2h0Ym94LXZpZXcnKTtcblxuZXhwb3J0IHsgXG5cdERCLCBcblx0YWxwaGFiZXQsIFxuXHQkbG9hZGluZywgXG5cdCRuYXYsIFxuXHQkcGFyYWxsYXgsXG5cdCRjb250ZW50LFxuXHQkdGl0bGUsXG5cdCRhcnJvdyxcblx0JG1vZGFsLFxuXHQkbGlnaHRib3gsXG5cdCR2aWV3IFxufTsiLCJpbXBvcnQgc21vb3Roc2Nyb2xsIGZyb20gJ3Ntb290aHNjcm9sbC1wb2x5ZmlsbCc7XG5cbmltcG9ydCB7IGFydGljbGVUZW1wbGF0ZSwgbmF2TGcgfSBmcm9tICcuL3RlbXBsYXRlcyc7XG5pbXBvcnQgeyBkZWJvdW5jZSwgaGlkZUxvYWRpbmcgfSBmcm9tICcuL3V0aWxzJztcbmltcG9ydCB7IERCLCBhbHBoYWJldCwgJG5hdiwgJHBhcmFsbGF4LCAkY29udGVudCwgJHRpdGxlLCAkYXJyb3csICRtb2RhbCwgJGxpZ2h0Ym94LCAkdmlldyB9IGZyb20gJy4vY29uc3RhbnRzJztcblxubGV0IHNvcnRLZXkgPSAwOyAvLyAwID0gYXJ0aXN0LCAxID0gdGl0bGVcbmxldCBlbnRyaWVzID0geyBieUF1dGhvcjogW10sIGJ5VGl0bGU6IFtdIH07XG5sZXQgY3VycmVudExldHRlciA9ICdBJztcbmxldCBtb2RhbCA9IGZhbHNlO1xubGV0IGxpZ2h0Ym94ID0gZmFsc2U7XG5cbmNvbnN0IGF0dGFjaEltYWdlTGlzdGVuZXJzID0gKCkgPT4ge1xuXHRjb25zdCAkaW1hZ2VzID0gQXJyYXkuZnJvbShkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKCcuYXJ0aWNsZS1pbWFnZScpKTtcblxuXHQkaW1hZ2VzLmZvckVhY2goaW1nID0+IHtcblx0XHRpbWcuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoZXZ0KSA9PiB7XG5cdFx0XHRpZiAoIWxpZ2h0Ym94KSB7XG5cdFx0XHRcdGxldCBzcmMgPSBpbWcuc3JjO1xuXHRcdFx0XHRcblx0XHRcdFx0JGxpZ2h0Ym94LmNsYXNzTGlzdC5hZGQoJ3Nob3ctaW1nJyk7XG5cdFx0XHRcdCR2aWV3LnNldEF0dHJpYnV0ZSgnc3R5bGUnLCBgYmFja2dyb3VuZC1pbWFnZTogdXJsKCR7c3JjfSlgKTtcblx0XHRcdFx0bGlnaHRib3ggPSB0cnVlO1xuXHRcdFx0fVxuXHRcdH0pO1xuXHR9KTtcblxuXHQkdmlldy5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsICgpID0+IHtcblx0XHRpZiAobGlnaHRib3gpIHtcblx0XHRcdCRsaWdodGJveC5jbGFzc0xpc3QucmVtb3ZlKCdzaG93LWltZycpO1xuXHRcdFx0bGlnaHRib3ggPSBmYWxzZTtcblx0XHR9XG5cdH0pO1xufTtcblxuY29uc3QgYXR0YWNoTW9kYWxMaXN0ZW5lcnMgPSAoKSA9PiB7XG5cdGNvbnN0ICRmaW5kID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2pzLWZpbmQnKTtcblx0XG5cdCRmaW5kLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKCkgPT4ge1xuXHRcdCRtb2RhbC5jbGFzc0xpc3QuYWRkKCdzaG93Jyk7XG5cdFx0bW9kYWwgPSB0cnVlO1xuXHR9KTtcblxuXHQkbW9kYWwuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoKSA9PiB7XG5cdFx0JG1vZGFsLmNsYXNzTGlzdC5yZW1vdmUoJ3Nob3cnKTtcblx0XHRtb2RhbCA9IGZhbHNlO1xuXHR9KTtcblxuXHR3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcigna2V5ZG93bicsICgpID0+IHtcblx0XHRpZiAobW9kYWwpIHtcblx0XHRcdHNldFRpbWVvdXQoKCkgPT4ge1xuXHRcdFx0XHQkbW9kYWwuY2xhc3NMaXN0LnJlbW92ZSgnc2hvdycpO1xuXHRcdFx0XHRtb2RhbCA9IGZhbHNlO1xuXHRcdFx0fSwgNjAwKTtcblx0XHR9O1xuXHR9KTtcbn1cblxuY29uc3Qgc2Nyb2xsVG9Ub3AgPSAoKSA9PiB7XG5cdGxldCB0aGluZyA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdhbmNob3ItdGFyZ2V0Jyk7XG5cdHRoaW5nLnNjcm9sbEludG9WaWV3KHtiZWhhdmlvcjogXCJzbW9vdGhcIiwgYmxvY2s6IFwic3RhcnRcIn0pO1xufVxuXG5sZXQgcHJldjtcbmxldCBjdXJyZW50ID0gMDtcbmxldCBpc1Nob3dpbmcgPSBmYWxzZTtcbmNvbnN0IGF0dGFjaEFycm93TGlzdGVuZXJzID0gKCkgPT4ge1xuXHQkYXJyb3cuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoKSA9PiB7XG5cdFx0c2Nyb2xsVG9Ub3AoKTtcblx0fSk7XG5cblx0JHBhcmFsbGF4LmFkZEV2ZW50TGlzdGVuZXIoJ3Njcm9sbCcsICgpID0+IHtcblxuXHRcdGxldCB5ID0gJHRpdGxlLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpLnk7XG5cdFx0aWYgKGN1cnJlbnQgIT09IHkpIHtcblx0XHRcdHByZXYgPSBjdXJyZW50O1xuXHRcdFx0Y3VycmVudCA9IHk7XG5cdFx0fVxuXG5cdFx0aWYgKHkgPD0gLTUwICYmICFpc1Nob3dpbmcpIHtcblx0XHRcdCRhcnJvdy5jbGFzc0xpc3QuYWRkKCdzaG93Jyk7XG5cdFx0XHRpc1Nob3dpbmcgPSB0cnVlO1xuXHRcdH0gZWxzZSBpZiAoeSA+IC01MCAmJiBpc1Nob3dpbmcpIHtcblx0XHRcdCRhcnJvdy5jbGFzc0xpc3QucmVtb3ZlKCdzaG93Jyk7XG5cdFx0XHRpc1Nob3dpbmcgPSBmYWxzZTtcblx0XHR9XG5cdH0pO1xufTtcblxuY29uc3QgYWRkU29ydEJ1dHRvbkxpc3RlbmVycyA9ICgpID0+IHtcblx0bGV0ICRieUFydGlzdCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdqcy1ieS1hcnRpc3QnKTtcblx0bGV0ICRieVRpdGxlID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2pzLWJ5LXRpdGxlJyk7XG5cdCRieUFydGlzdC5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsICgpID0+IHtcblx0XHRpZiAoc29ydEtleSkge1xuXHRcdFx0c2Nyb2xsVG9Ub3AoKTtcblx0XHRcdHNvcnRLZXkgPSAwO1xuXHRcdFx0JGJ5QXJ0aXN0LmNsYXNzTGlzdC5hZGQoJ2FjdGl2ZScpO1xuXHRcdFx0JGJ5VGl0bGUuY2xhc3NMaXN0LnJlbW92ZSgnYWN0aXZlJyk7XG5cblx0XHRcdHJlbmRlckVudHJpZXMoKTtcblx0XHR9XG5cdH0pO1xuXG5cdCRieVRpdGxlLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKCkgPT4ge1xuXHRcdGlmICghc29ydEtleSkge1xuXHRcdFx0c2Nyb2xsVG9Ub3AoKTtcblx0XHRcdHNvcnRLZXkgPSAxO1xuXHRcdFx0JGJ5VGl0bGUuY2xhc3NMaXN0LmFkZCgnYWN0aXZlJyk7XG5cdFx0XHQkYnlBcnRpc3QuY2xhc3NMaXN0LnJlbW92ZSgnYWN0aXZlJyk7XG5cblx0XHRcdHJlbmRlckVudHJpZXMoKTtcblx0XHR9XG5cdH0pO1xufTtcblxuY29uc3QgY2xlYXJBbmNob3JzID0gKHByZXZTZWxlY3RvcikgPT4ge1xuXHRsZXQgJGVudHJpZXMgPSBBcnJheS5mcm9tKGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwocHJldlNlbGVjdG9yKSk7XG5cdCRlbnRyaWVzLmZvckVhY2goZW50cnkgPT4gZW50cnkucmVtb3ZlQXR0cmlidXRlKCduYW1lJykpO1xufTtcblxuY29uc3QgZmluZEZpcnN0RW50cnkgPSAoY2hhcikgPT4ge1xuXHRsZXQgc2VsZWN0b3IgPSBzb3J0S2V5ID8gJy5qcy1lbnRyeS10aXRsZScgOiAnLmpzLWVudHJ5LWFydGlzdCc7XG5cdGxldCBwcmV2U2VsZWN0b3IgPSAhc29ydEtleSA/ICcuanMtZW50cnktdGl0bGUnIDogJy5qcy1lbnRyeS1hcnRpc3QnO1xuXHRsZXQgJGVudHJpZXMgPSBBcnJheS5mcm9tKGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoc2VsZWN0b3IpKTtcblxuXHRjbGVhckFuY2hvcnMocHJldlNlbGVjdG9yKTtcblxuXHRyZXR1cm4gJGVudHJpZXMuZmluZChlbnRyeSA9PiB7XG5cdFx0bGV0IG5vZGUgPSBlbnRyeS5uZXh0RWxlbWVudFNpYmxpbmc7XG5cdFx0cmV0dXJuIG5vZGUuaW5uZXJIVE1MWzBdID09PSBjaGFyIHx8IG5vZGUuaW5uZXJIVE1MWzBdID09PSBjaGFyLnRvVXBwZXJDYXNlKCk7XG5cdH0pO1xufTtcblxuXG5jb25zdCBtYWtlQWxwaGFiZXQgPSAoKSA9PiB7XG5cdGNvbnN0IGF0dGFjaEFuY2hvckxpc3RlbmVyID0gKCRhbmNob3IsIGxldHRlcikgPT4ge1xuXHRcdCRhbmNob3IuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoKSA9PiB7XG5cdFx0XHRjb25zdCBsZXR0ZXJOb2RlID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQobGV0dGVyKTtcblx0XHRcdGxldCB0YXJnZXQ7XG5cblx0XHRcdGlmICghc29ydEtleSkge1xuXHRcdFx0XHR0YXJnZXQgPSBsZXR0ZXIgPT09ICdhJyA/IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdhbmNob3ItdGFyZ2V0JykgOiBsZXR0ZXJOb2RlLnBhcmVudEVsZW1lbnQucGFyZW50RWxlbWVudC5wYXJlbnRFbGVtZW50LnBhcmVudEVsZW1lbnQucHJldmlvdXNFbGVtZW50U2libGluZy5xdWVyeVNlbGVjdG9yKCcuanMtYXJ0aWNsZS1hbmNob3ItdGFyZ2V0Jyk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHR0YXJnZXQgPSBsZXR0ZXIgPT09ICdhJyA/IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdhbmNob3ItdGFyZ2V0JykgOiBsZXR0ZXJOb2RlLnBhcmVudEVsZW1lbnQucGFyZW50RWxlbWVudC5wYXJlbnRFbGVtZW50LnByZXZpb3VzRWxlbWVudFNpYmxpbmcucXVlcnlTZWxlY3RvcignLmpzLWFydGljbGUtYW5jaG9yLXRhcmdldCcpO1xuXHRcdFx0fTtcblxuXHRcdFx0dGFyZ2V0LnNjcm9sbEludG9WaWV3KHtiZWhhdmlvcjogXCJzbW9vdGhcIiwgYmxvY2s6IFwic3RhcnRcIn0pO1xuXHRcdH0pO1xuXHR9O1xuXG5cdGxldCBhY3RpdmVFbnRyaWVzID0ge307XG5cdGxldCAkb3V0ZXIgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcuYWxwaGFiZXRfX2xldHRlcnMnKTtcblx0JG91dGVyLmlubmVySFRNTCA9ICcnO1xuXG5cdGFscGhhYmV0LmZvckVhY2gobGV0dGVyID0+IHtcblx0XHRsZXQgJGZpcnN0RW50cnkgPSBmaW5kRmlyc3RFbnRyeShsZXR0ZXIpO1xuXHRcdGxldCAkYW5jaG9yID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnYScpO1xuXG5cdFx0aWYgKCEkZmlyc3RFbnRyeSkgcmV0dXJuO1xuXG5cdFx0JGZpcnN0RW50cnkuaWQgPSBsZXR0ZXI7XG5cdFx0JGFuY2hvci5pbm5lckhUTUwgPSBsZXR0ZXIudG9VcHBlckNhc2UoKTtcblx0XHQkYW5jaG9yLmNsYXNzTmFtZSA9ICdhbHBoYWJldF9fbGV0dGVyLWFuY2hvcic7XG5cblx0XHRhdHRhY2hBbmNob3JMaXN0ZW5lcigkYW5jaG9yLCBsZXR0ZXIpO1xuXHRcdCRvdXRlci5hcHBlbmRDaGlsZCgkYW5jaG9yKTtcblx0fSk7XG59O1xuXG5jb25zdCByZW5kZXJJbWFnZXMgPSAoaW1hZ2VzLCAkaW1hZ2VzKSA9PiB7XG5cdGltYWdlcy5mb3JFYWNoKGltYWdlID0+IHtcblx0XHRjb25zdCBzcmMgPSBgLi4vLi4vYXNzZXRzL2ltYWdlcy8ke2ltYWdlfWA7XG5cdFx0Y29uc3QgJGltZ091dGVyID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG5cdFx0Y29uc3QgJGltZyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ0lNRycpO1xuXHRcdCRpbWcuY2xhc3NOYW1lID0gJ2FydGljbGUtaW1hZ2UnO1xuXHRcdCRpbWcuc3JjID0gc3JjO1xuXHRcdCRpbWdPdXRlci5hcHBlbmRDaGlsZCgkaW1nKTtcblx0XHQkaW1hZ2VzLmFwcGVuZENoaWxkKCRpbWdPdXRlcik7XG5cdH0pXG59O1xuXG5jb25zdCByZW5kZXJFbnRyaWVzID0gKCkgPT4ge1xuXHRjb25zdCAkYXJ0aWNsZUxpc3QgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnanMtbGlzdCcpO1xuXHRjb25zdCBlbnRyaWVzTGlzdCA9IHNvcnRLZXkgPyBlbnRyaWVzLmJ5VGl0bGUgOiBlbnRyaWVzLmJ5QXV0aG9yO1xuXG5cdCRhcnRpY2xlTGlzdC5pbm5lckhUTUwgPSAnJztcblxuXHRlbnRyaWVzTGlzdC5mb3JFYWNoKGVudHJ5ID0+IHtcblx0XHRjb25zdCB7IHRpdGxlLCBsYXN0TmFtZSwgZmlyc3ROYW1lLCBpbWFnZXMsIGRlc2NyaXB0aW9uLCBkZXRhaWwgfSA9IGVudHJ5O1xuXG5cdFx0JGFydGljbGVMaXN0Lmluc2VydEFkamFjZW50SFRNTCgnYmVmb3JlZW5kJywgYXJ0aWNsZVRlbXBsYXRlKTtcblxuXHRcdGNvbnN0ICRhbGxTbGlkZXJzID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbCgnLmFydGljbGVfX3NsaWRlci1pbm5lcicpO1xuXHRcdGNvbnN0ICRzbGlkZXIgPSAkYWxsU2xpZGVyc1skYWxsU2xpZGVycy5sZW5ndGggLSAxXTtcblx0XHQvLyBjb25zdCAkaW1hZ2VzID0gJHNsaWRlci5xdWVyeVNlbGVjdG9yKCcuYXJ0aWNsZV9faW1hZ2VzJyk7XG5cblx0XHRpZiAoaW1hZ2VzLmxlbmd0aCkgcmVuZGVySW1hZ2VzKGltYWdlcywgJHNsaWRlcik7XG5cdFx0XG5cdFx0Y29uc3QgJGRlc2NyaXB0aW9uT3V0ZXIgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcblx0XHRjb25zdCAkZGVzY3JpcHRpb25Ob2RlID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgncCcpO1xuXHRcdGNvbnN0ICRkZXRhaWxOb2RlID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgncCcpO1xuXHRcdCRkZXNjcmlwdGlvbk91dGVyLmNsYXNzTGlzdC5hZGQoJ2FydGljbGUtZGVzY3JpcHRpb25fX291dGVyJyk7XG5cdFx0JGRlc2NyaXB0aW9uTm9kZS5jbGFzc0xpc3QuYWRkKCdhcnRpY2xlLWRlc2NyaXB0aW9uJyk7XG5cdFx0JGRldGFpbE5vZGUuY2xhc3NMaXN0LmFkZCgnYXJ0aWNsZS1kZXRhaWwnKTtcblxuXHRcdCRkZXNjcmlwdGlvbk5vZGUuaW5uZXJIVE1MID0gZGVzY3JpcHRpb247XG5cdFx0JGRldGFpbE5vZGUuaW5uZXJIVE1MID0gZGV0YWlsO1xuXG5cdFx0JGRlc2NyaXB0aW9uT3V0ZXIuYXBwZW5kQ2hpbGQoJGRlc2NyaXB0aW9uTm9kZSwgJGRldGFpbE5vZGUpO1xuXHRcdCRzbGlkZXIuYXBwZW5kQ2hpbGQoJGRlc2NyaXB0aW9uT3V0ZXIpO1xuXG5cdFx0Y29uc3QgJHRpdGxlTm9kZXMgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKCcuYXJ0aWNsZS1oZWFkaW5nX190aXRsZScpO1xuXHRcdGNvbnN0ICR0aXRsZSA9ICR0aXRsZU5vZGVzWyR0aXRsZU5vZGVzLmxlbmd0aCAtIDFdO1xuXG5cdFx0Y29uc3QgJGZpcnN0Tm9kZXMgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKCcuYXJ0aWNsZS1oZWFkaW5nX19uYW1lLS1maXJzdCcpO1xuXHRcdGNvbnN0ICRmaXJzdCA9ICRmaXJzdE5vZGVzWyRmaXJzdE5vZGVzLmxlbmd0aCAtIDFdO1xuXG5cdFx0Y29uc3QgJGxhc3ROb2RlcyA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoJy5hcnRpY2xlLWhlYWRpbmdfX25hbWUtLWxhc3QnKTtcblx0XHRjb25zdCAkbGFzdCA9ICRsYXN0Tm9kZXNbJGxhc3ROb2Rlcy5sZW5ndGggLSAxXTtcblxuXHRcdCR0aXRsZS5pbm5lckhUTUwgPSB0aXRsZTtcblx0XHQkZmlyc3QuaW5uZXJIVE1MID0gZmlyc3ROYW1lO1xuXHRcdCRsYXN0LmlubmVySFRNTCA9IGxhc3ROYW1lO1xuXG5cdFx0Y29uc3QgJGFycm93TmV4dCA9ICRzbGlkZXIucGFyZW50RWxlbWVudC5xdWVyeVNlbGVjdG9yKCcuYXJyb3ctbmV4dCcpO1xuXHRcdGNvbnN0ICRhcnJvd1ByZXYgPSAkc2xpZGVyLnBhcmVudEVsZW1lbnQucXVlcnlTZWxlY3RvcignLmFycm93LXByZXYnKTtcblxuXHRcdGxldCBjdXJyZW50ID0gJHNsaWRlci5maXJzdEVsZW1lbnRDaGlsZDtcblx0XHQkYXJyb3dOZXh0LmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKCkgPT4ge1xuXHRcdFx0Y29uc3QgbmV4dCA9IGN1cnJlbnQubmV4dEVsZW1lbnRTaWJsaW5nO1xuXHRcdFx0aWYgKG5leHQpIHtcblx0XHRcdFx0bmV4dC5zY3JvbGxJbnRvVmlldyh7YmVoYXZpb3I6IFwic21vb3RoXCIsIGJsb2NrOiBcIm5lYXJlc3RcIiwgaW5saW5lOiBcImNlbnRlclwifSk7XG5cdFx0XHRcdGN1cnJlbnQgPSBuZXh0O1xuXHRcdFx0fVxuXHRcdH0pO1xuXG5cdFx0JGFycm93UHJldi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsICgpID0+IHtcblx0XHRcdGNvbnN0IHByZXYgPSBjdXJyZW50LnByZXZpb3VzRWxlbWVudFNpYmxpbmc7XG5cdFx0XHRpZiAocHJldikge1xuXHRcdFx0XHRwcmV2LnNjcm9sbEludG9WaWV3KHtiZWhhdmlvcjogXCJzbW9vdGhcIiwgYmxvY2s6IFwibmVhcmVzdFwiLCBpbmxpbmU6IFwiY2VudGVyXCJ9KTtcblx0XHRcdFx0Y3VycmVudCA9IHByZXY7XG5cdFx0XHR9XG5cdFx0fSlcblx0fSk7XG5cblx0YXR0YWNoSW1hZ2VMaXN0ZW5lcnMoKTtcblx0bWFrZUFscGhhYmV0KCk7XG59O1xuXG4vLyB0aGlzIG5lZWRzIHRvIGJlIGEgZGVlcGVyIHNvcnRcbmNvbnN0IHNvcnRCeVRpdGxlID0gKCkgPT4ge1xuXHRlbnRyaWVzLmJ5VGl0bGUuc29ydCgoYSwgYikgPT4ge1xuXHRcdGxldCBhVGl0bGUgPSBhLnRpdGxlWzBdLnRvVXBwZXJDYXNlKCk7XG5cdFx0bGV0IGJUaXRsZSA9IGIudGl0bGVbMF0udG9VcHBlckNhc2UoKTtcblx0XHRpZiAoYVRpdGxlID4gYlRpdGxlKSByZXR1cm4gMTtcblx0XHRlbHNlIGlmIChhVGl0bGUgPCBiVGl0bGUpIHJldHVybiAtMTtcblx0XHRlbHNlIHJldHVybiAwO1xuXHR9KTtcbn07XG5cbmNvbnN0IHNldERhdGEgPSAoZGF0YSkgPT4ge1xuXHRlbnRyaWVzLmJ5QXV0aG9yID0gZGF0YTtcblx0ZW50cmllcy5ieVRpdGxlID0gZGF0YS5zbGljZSgpOyAvLyBjb3BpZXMgZGF0YSBmb3IgYnlUaXRsZSBzb3J0XG5cblx0c29ydEJ5VGl0bGUoKTtcblx0cmVuZGVyRW50cmllcygpO1xufTtcblxuY29uc3QgZmV0Y2hEYXRhID0gKCkgPT4ge1xuXHRmZXRjaChEQikudGhlbihyZXMgPT4gcmVzLmpzb24oKSlcblx0LnRoZW4oZGF0YSA9PiB7XG5cdFx0c2V0RGF0YShkYXRhKTtcblx0XHRoaWRlTG9hZGluZygpO1xuXHR9KVxuXHQuY2F0Y2goZXJyID0+IGNvbnNvbGUud2FybihlcnIpKTtcbn07XG5cbmNvbnN0IGluaXQgPSAoKSA9PiB7XG5cdHNtb290aHNjcm9sbC5wb2x5ZmlsbCgpO1xuXHRmZXRjaERhdGEoKTtcblx0bmF2TGcoKTtcblx0YWRkU29ydEJ1dHRvbkxpc3RlbmVycygpO1xuXHRhdHRhY2hBcnJvd0xpc3RlbmVycygpO1xuXHRhdHRhY2hNb2RhbExpc3RlbmVycygpO1xufVxuXG5pbml0KCk7XG4iLCJjb25zdCBhcnRpY2xlVGVtcGxhdGUgPSBgXG5cdDxhcnRpY2xlIGNsYXNzPVwiYXJ0aWNsZV9fb3V0ZXJcIj5cblx0XHQ8ZGl2IGNsYXNzPVwiYXJ0aWNsZV9faW5uZXJcIj5cblx0XHRcdDxkaXYgY2xhc3M9XCJhcnRpY2xlX19oZWFkaW5nXCI+XG5cdFx0XHRcdDxhIGNsYXNzPVwianMtZW50cnktdGl0bGVcIj48L2E+XG5cdFx0XHRcdDxoMiBjbGFzcz1cImFydGljbGUtaGVhZGluZ19fdGl0bGVcIj48L2gyPlxuXHRcdFx0XHQ8ZGl2IGNsYXNzPVwiYXJ0aWNsZS1oZWFkaW5nX19uYW1lXCI+XG5cdFx0XHRcdFx0PHNwYW4gY2xhc3M9XCJhcnRpY2xlLWhlYWRpbmdfX25hbWUtLWZpcnN0XCI+PC9zcGFuPlxuXHRcdFx0XHRcdDxhIGNsYXNzPVwianMtZW50cnktYXJ0aXN0XCI+PC9hPlxuXHRcdFx0XHRcdDxzcGFuIGNsYXNzPVwiYXJ0aWNsZS1oZWFkaW5nX19uYW1lLS1sYXN0XCI+PC9zcGFuPlxuXHRcdFx0XHQ8L2Rpdj5cblx0XHRcdDwvZGl2Plx0XG5cdFx0XHQ8ZGl2IGNsYXNzPVwiYXJ0aWNsZV9fc2xpZGVyLW91dGVyXCI+XG5cdFx0XHRcdDxkaXYgY2xhc3M9XCJhcnRpY2xlX19zbGlkZXItaW5uZXJcIj48L2Rpdj5cblx0XHRcdFx0PGRpdiBjbGFzcz1cImFydGljbGVfX3Njcm9sbC1jb250cm9sc1wiPlxuXHRcdFx0XHRcdDxzcGFuIGNsYXNzPVwiY29udHJvbHMgYXJyb3ctcHJldlwiPuKGkDwvc3Bhbj4gXG5cdFx0XHRcdFx0PHNwYW4gY2xhc3M9XCJjb250cm9scyBhcnJvdy1uZXh0XCI+4oaSPC9zcGFuPlxuXHRcdFx0XHQ8L2Rpdj5cblx0XHRcdFx0PHAgY2xhc3M9XCJqcy1hcnRpY2xlLWFuY2hvci10YXJnZXRcIj48L3A+XG5cdFx0PC9kaXY+XG5cdDwvYXJ0aWNsZT5cbmA7XG5cbmV4cG9ydCBkZWZhdWx0IGFydGljbGVUZW1wbGF0ZTsiLCJpbXBvcnQgYXJ0aWNsZVRlbXBsYXRlIGZyb20gJy4vYXJ0aWNsZSc7XG5pbXBvcnQgbmF2TGcgZnJvbSAnLi9uYXZMZyc7XG5cbmV4cG9ydCB7IGFydGljbGVUZW1wbGF0ZSwgbmF2TGcgfTsiLCJjb25zdCB0ZW1wbGF0ZSA9IFxuXHRgPGRpdiBjbGFzcz1cIm5hdl9faW5uZXJcIj5cblx0XHQ8ZGl2IGNsYXNzPVwibmF2X19zb3J0LWJ5XCI+XG5cdFx0XHQ8c3BhbiBjbGFzcz1cInNvcnQtYnlfX3RpdGxlXCI+U29ydCBieTwvc3Bhbj5cblx0XHRcdDxidXR0b24gY2xhc3M9XCJzb3J0LWJ5IHNvcnQtYnlfX2J5LWFydGlzdCBhY3RpdmVcIiBpZD1cImpzLWJ5LWFydGlzdFwiPkFydGlzdDwvYnV0dG9uPlxuXHRcdFx0PHNwYW4gY2xhc3M9XCJzb3J0LWJ5X19kaXZpZGVyXCI+IHwgPC9zcGFuPlxuXHRcdFx0PGJ1dHRvbiBjbGFzcz1cInNvcnQtYnkgc29ydC1ieV9fYnktdGl0bGVcIiBpZD1cImpzLWJ5LXRpdGxlXCI+VGl0bGU8L2J1dHRvbj5cblx0XHRcdDxzcGFuIGNsYXNzPVwiZmluZFwiIGlkPVwianMtZmluZFwiPlxuXHRcdFx0XHQoPHNwYW4gY2xhc3M9XCJmaW5kLS1pbm5lclwiPiYjODk4NDtGPC9zcGFuPilcblx0XHRcdDwvc3Bhbj5cblx0XHQ8L2Rpdj5cblx0XHQ8ZGl2IGNsYXNzPVwibmF2X19hbHBoYWJldFwiPlxuXHRcdFx0PHNwYW4gY2xhc3M9XCJhbHBoYWJldF9fdGl0bGVcIj5HbyB0bzwvc3Bhbj5cblx0XHRcdDxkaXYgY2xhc3M9XCJhbHBoYWJldF9fbGV0dGVyc1wiPjwvZGl2PlxuXHRcdDwvZGl2PlxuXHQ8L2Rpdj5gO1xuXG5jb25zdCBuYXZMZyA9ICgpID0+IHtcblx0bGV0IG5hdk91dGVyID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2pzLW5hdicpO1xuXHRuYXZPdXRlci5pbm5lckhUTUwgPSB0ZW1wbGF0ZTtcbn07XG5cbmV4cG9ydCBkZWZhdWx0IG5hdkxnOyIsImltcG9ydCB7ICRsb2FkaW5nLCAkbmF2LCAkcGFyYWxsYXgsICRjb250ZW50LCAkdGl0bGUsICRhcnJvdywgJG1vZGFsLCAkbGlnaHRib3gsICR2aWV3IH0gZnJvbSAnLi4vY29uc3RhbnRzJztcblxuY29uc3QgZGVib3VuY2UgPSAoZm4sIHRpbWUpID0+IHtcbiAgbGV0IHRpbWVvdXQ7XG5cbiAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgIGNvbnN0IGZ1bmN0aW9uQ2FsbCA9ICgpID0+IGZuLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgXG4gICAgY2xlYXJUaW1lb3V0KHRpbWVvdXQpO1xuICAgIHRpbWVvdXQgPSBzZXRUaW1lb3V0KGZ1bmN0aW9uQ2FsbCwgdGltZSk7XG4gIH1cbn07XG5cbmNvbnN0IGhpZGVMb2FkaW5nID0gKCkgPT4ge1xuXHQkbG9hZGluZy5mb3JFYWNoKGVsZW0gPT4ge1xuXHRcdGVsZW0uY2xhc3NMaXN0LnJlbW92ZSgnbG9hZGluZycpO1xuXHRcdGVsZW0uY2xhc3NMaXN0LmFkZCgncmVhZHknKTtcblx0fSk7XG5cdCRuYXYuY2xhc3NMaXN0LmFkZCgncmVhZHknKTtcbn07XG5cbmV4cG9ydCB7IGRlYm91bmNlLCBoaWRlTG9hZGluZyB9OyJdLCJwcmVFeGlzdGluZ0NvbW1lbnQiOiIvLyMgc291cmNlTWFwcGluZ1VSTD1kYXRhOmFwcGxpY2F0aW9uL2pzb247Y2hhcnNldD11dGYtODtiYXNlNjQsZXlKMlpYSnphVzl1SWpvekxDSnpiM1Z5WTJWeklqcGJJbTV2WkdWZmJXOWtkV3hsY3k5aWNtOTNjMlZ5TFhCaFkyc3ZYM0J5Wld4MVpHVXVhbk1pTENKdWIyUmxYMjF2WkhWc1pYTXZjMjF2YjNSb2MyTnliMnhzTFhCdmJIbG1hV3hzTDJScGMzUXZjMjF2YjNSb2MyTnliMnhzTG1weklpd2ljM0pqTDJwekwyTnZibk4wWVc1MGN5NXFjeUlzSW5OeVl5OXFjeTlwYm1SbGVDNXFjeUlzSW5OeVl5OXFjeTkwWlcxd2JHRjBaWE12WVhKMGFXTnNaUzVxY3lJc0luTnlZeTlxY3k5MFpXMXdiR0YwWlhNdmFXNWtaWGd1YW5NaUxDSnpjbU12YW5NdmRHVnRjR3hoZEdWekwyNWhka3huTG1weklpd2ljM0pqTDJwekwzVjBhV3h6TDJsdVpHVjRMbXB6SWwwc0ltNWhiV1Z6SWpwYlhTd2liV0Z3Y0dsdVozTWlPaUpCUVVGQk8wRkRRVUU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHM3T3pzN096dEJRM1ppUVN4SlFVRk5MRXRCUVVzc0swWkJRVmc3UVVGRFFTeEpRVUZOTEZkQlFWY3NRMEZCUXl4SFFVRkVMRVZCUVUwc1IwRkJUaXhGUVVGWExFZEJRVmdzUlVGQlowSXNSMEZCYUVJc1JVRkJjVUlzUjBGQmNrSXNSVUZCTUVJc1IwRkJNVUlzUlVGQkswSXNSMEZCTDBJc1JVRkJiME1zUjBGQmNFTXNSVUZCZVVNc1IwRkJla01zUlVGQk9FTXNSMEZCT1VNc1JVRkJiVVFzUjBGQmJrUXNSVUZCZDBRc1IwRkJlRVFzUlVGQk5rUXNSMEZCTjBRc1JVRkJhMFVzUjBGQmJFVXNSVUZCZFVVc1IwRkJka1VzUlVGQk5FVXNSMEZCTlVVc1JVRkJhVVlzUjBGQmFrWXNSVUZCYzBZc1IwRkJkRVlzUlVGQk1rWXNSMEZCTTBZc1JVRkJaMGNzUjBGQmFFY3NSVUZCY1Vjc1IwRkJja2NzUlVGQk1FY3NSMEZCTVVjc1JVRkJLMGNzUjBGQkwwY3NSVUZCYjBnc1IwRkJjRWdzUTBGQmFrSTdPMEZCUlVFc1NVRkJUU3hYUVVGWExFMUJRVTBzU1VGQlRpeERRVUZYTEZOQlFWTXNaMEpCUVZRc1EwRkJNRUlzVlVGQk1VSXNRMEZCV0N4RFFVRnFRanRCUVVOQkxFbEJRVTBzVDBGQlR5eFRRVUZUTEdOQlFWUXNRMEZCZDBJc1VVRkJlRUlzUTBGQllqdEJRVU5CTEVsQlFVMHNXVUZCV1N4VFFVRlRMR0ZCUVZRc1EwRkJkVUlzVjBGQmRrSXNRMEZCYkVJN1FVRkRRU3hKUVVGTkxGZEJRVmNzVTBGQlV5eGhRVUZVTEVOQlFYVkNMRlZCUVhaQ0xFTkJRV3BDTzBGQlEwRXNTVUZCVFN4VFFVRlRMRk5CUVZNc1kwRkJWQ3hEUVVGM1FpeFZRVUY0UWl4RFFVRm1PMEZCUTBFc1NVRkJUU3hUUVVGVExGTkJRVk1zWVVGQlZDeERRVUYxUWl4UlFVRjJRaXhEUVVGbU8wRkJRMEVzU1VGQlRTeFRRVUZUTEZOQlFWTXNZVUZCVkN4RFFVRjFRaXhSUVVGMlFpeERRVUZtTzBGQlEwRXNTVUZCVFN4WlFVRlpMRk5CUVZNc1lVRkJWQ3hEUVVGMVFpeFhRVUYyUWl4RFFVRnNRanRCUVVOQkxFbEJRVTBzVVVGQlVTeFRRVUZUTEdGQlFWUXNRMEZCZFVJc1owSkJRWFpDTEVOQlFXUTdPMUZCUjBNc1JTeEhRVUZCTEVVN1VVRkRRU3hSTEVkQlFVRXNVVHRSUVVOQkxGRXNSMEZCUVN4Uk8xRkJRMEVzU1N4SFFVRkJMRWs3VVVGRFFTeFRMRWRCUVVFc1V6dFJRVU5CTEZFc1IwRkJRU3hSTzFGQlEwRXNUU3hIUVVGQkxFMDdVVUZEUVN4TkxFZEJRVUVzVFR0UlFVTkJMRTBzUjBGQlFTeE5PMUZCUTBFc1V5eEhRVUZCTEZNN1VVRkRRU3hMTEVkQlFVRXNTenM3T3pzN1FVTjRRa1E3T3pzN1FVRkZRVHM3UVVGRFFUczdRVUZEUVRzN096dEJRVVZCTEVsQlFVa3NWVUZCVlN4RFFVRmtMRU1zUTBGQmFVSTdRVUZEYWtJc1NVRkJTU3hWUVVGVkxFVkJRVVVzVlVGQlZTeEZRVUZhTEVWQlFXZENMRk5CUVZNc1JVRkJla0lzUlVGQlpEdEJRVU5CTEVsQlFVa3NaMEpCUVdkQ0xFZEJRWEJDTzBGQlEwRXNTVUZCU1N4UlFVRlJMRXRCUVZvN1FVRkRRU3hKUVVGSkxGZEJRVmNzUzBGQlpqczdRVUZGUVN4SlFVRk5MSFZDUVVGMVFpeFRRVUYyUWl4dlFrRkJkVUlzUjBGQlRUdEJRVU5zUXl4TFFVRk5MRlZCUVZVc1RVRkJUU3hKUVVGT0xFTkJRVmNzVTBGQlV5eG5Ra0ZCVkN4RFFVRXdRaXhuUWtGQk1VSXNRMEZCV0N4RFFVRm9RanM3UVVGRlFTeFRRVUZSTEU5QlFWSXNRMEZCWjBJc1pVRkJUenRCUVVOMFFpeE5RVUZKTEdkQ1FVRktMRU5CUVhGQ0xFOUJRWEpDTEVWQlFUaENMRlZCUVVNc1IwRkJSQ3hGUVVGVE8wRkJRM1JETEU5QlFVa3NRMEZCUXl4UlFVRk1MRVZCUVdVN1FVRkRaQ3hSUVVGSkxFMUJRVTBzU1VGQlNTeEhRVUZrT3p0QlFVVkJMSGxDUVVGVkxGTkJRVllzUTBGQmIwSXNSMEZCY0VJc1EwRkJkMElzVlVGQmVFSTdRVUZEUVN4eFFrRkJUU3haUVVGT0xFTkJRVzFDTEU5QlFXNUNMRFpDUVVGeFJDeEhRVUZ5UkR0QlFVTkJMR1ZCUVZjc1NVRkJXRHRCUVVOQk8wRkJRMFFzUjBGU1JEdEJRVk5CTEVWQlZrUTdPMEZCV1VFc2EwSkJRVTBzWjBKQlFVNHNRMEZCZFVJc1QwRkJka0lzUlVGQlowTXNXVUZCVFR0QlFVTnlReXhOUVVGSkxGRkJRVW9zUlVGQll6dEJRVU5pTEhkQ1FVRlZMRk5CUVZZc1EwRkJiMElzVFVGQmNFSXNRMEZCTWtJc1ZVRkJNMEk3UVVGRFFTeGpRVUZYTEV0QlFWZzdRVUZEUVR0QlFVTkVMRVZCVEVRN1FVRk5RU3hEUVhKQ1JEczdRVUYxUWtFc1NVRkJUU3gxUWtGQmRVSXNVMEZCZGtJc2IwSkJRWFZDTEVkQlFVMDdRVUZEYkVNc1MwRkJUU3hSUVVGUkxGTkJRVk1zWTBGQlZDeERRVUYzUWl4VFFVRjRRaXhEUVVGa096dEJRVVZCTEU5QlFVMHNaMEpCUVU0c1EwRkJkVUlzVDBGQmRrSXNSVUZCWjBNc1dVRkJUVHRCUVVOeVF5eHZRa0ZCVHl4VFFVRlFMRU5CUVdsQ0xFZEJRV3BDTEVOQlFYRkNMRTFCUVhKQ08wRkJRMEVzVlVGQlVTeEpRVUZTTzBGQlEwRXNSVUZJUkRzN1FVRkxRU3h0UWtGQlR5eG5Ra0ZCVUN4RFFVRjNRaXhQUVVGNFFpeEZRVUZwUXl4WlFVRk5PMEZCUTNSRExHOUNRVUZQTEZOQlFWQXNRMEZCYVVJc1RVRkJha0lzUTBGQmQwSXNUVUZCZUVJN1FVRkRRU3hWUVVGUkxFdEJRVkk3UVVGRFFTeEZRVWhFT3p0QlFVdEJMRkZCUVU4c1owSkJRVkFzUTBGQmQwSXNVMEZCZUVJc1JVRkJiVU1zV1VGQlRUdEJRVU40UXl4TlFVRkpMRXRCUVVvc1JVRkJWenRCUVVOV0xHTkJRVmNzV1VGQlRUdEJRVU5vUWl4elFrRkJUeXhUUVVGUUxFTkJRV2xDTEUxQlFXcENMRU5CUVhkQ0xFMUJRWGhDTzBGQlEwRXNXVUZCVVN4TFFVRlNPMEZCUTBFc1NVRklSQ3hGUVVkSExFZEJTRWc3UVVGSlFUdEJRVU5FTEVWQlVFUTdRVUZSUVN4RFFYSkNSRHM3UVVGMVFrRXNTVUZCVFN4alFVRmpMRk5CUVdRc1YwRkJZeXhIUVVGTk8wRkJRM3BDTEV0QlFVa3NVVUZCVVN4VFFVRlRMR05CUVZRc1EwRkJkMElzWlVGQmVFSXNRMEZCV2p0QlFVTkJMRTlCUVUwc1kwRkJUaXhEUVVGeFFpeEZRVUZETEZWQlFWVXNVVUZCV0N4RlFVRnhRaXhQUVVGUExFOUJRVFZDTEVWQlFYSkNPMEZCUTBFc1EwRklSRHM3UVVGTFFTeEpRVUZKTEdGQlFVbzdRVUZEUVN4SlFVRkpMRlZCUVZVc1EwRkJaRHRCUVVOQkxFbEJRVWtzV1VGQldTeExRVUZvUWp0QlFVTkJMRWxCUVUwc2RVSkJRWFZDTEZOQlFYWkNMRzlDUVVGMVFpeEhRVUZOTzBGQlEyeERMRzFDUVVGUExHZENRVUZRTEVOQlFYZENMRTlCUVhoQ0xFVkJRV2xETEZsQlFVMDdRVUZEZEVNN1FVRkRRU3hGUVVaRU96dEJRVWxCTEhOQ1FVRlZMR2RDUVVGV0xFTkJRVEpDTEZGQlFUTkNMRVZCUVhGRExGbEJRVTA3TzBGQlJURkRMRTFCUVVrc1NVRkJTU3hyUWtGQlR5eHhRa0ZCVUN4SFFVRXJRaXhEUVVGMlF6dEJRVU5CTEUxQlFVa3NXVUZCV1N4RFFVRm9RaXhGUVVGdFFqdEJRVU5zUWl4VlFVRlBMRTlCUVZBN1FVRkRRU3hoUVVGVkxFTkJRVlk3UVVGRFFUczdRVUZGUkN4TlFVRkpMRXRCUVVzc1EwRkJReXhGUVVGT0xFbEJRVmtzUTBGQlF5eFRRVUZxUWl4RlFVRTBRanRCUVVNelFpeHhRa0ZCVHl4VFFVRlFMRU5CUVdsQ0xFZEJRV3BDTEVOQlFYRkNMRTFCUVhKQ08wRkJRMEVzWlVGQldTeEpRVUZhTzBGQlEwRXNSMEZJUkN4TlFVZFBMRWxCUVVrc1NVRkJTU3hEUVVGRExFVkJRVXdzU1VGQlZ5eFRRVUZtTEVWQlFUQkNPMEZCUTJoRExIRkNRVUZQTEZOQlFWQXNRMEZCYVVJc1RVRkJha0lzUTBGQmQwSXNUVUZCZUVJN1FVRkRRU3hsUVVGWkxFdEJRVm83UVVGRFFUdEJRVU5FTEVWQlprUTdRVUZuUWtFc1EwRnlRa1E3TzBGQmRVSkJMRWxCUVUwc2VVSkJRWGxDTEZOQlFYcENMSE5DUVVGNVFpeEhRVUZOTzBGQlEzQkRMRXRCUVVrc1dVRkJXU3hUUVVGVExHTkJRVlFzUTBGQmQwSXNZMEZCZUVJc1EwRkJhRUk3UVVGRFFTeExRVUZKTEZkQlFWY3NVMEZCVXl4alFVRlVMRU5CUVhkQ0xHRkJRWGhDTEVOQlFXWTdRVUZEUVN4WFFVRlZMR2RDUVVGV0xFTkJRVEpDTEU5QlFUTkNMRVZCUVc5RExGbEJRVTA3UVVGRGVrTXNUVUZCU1N4UFFVRktMRVZCUVdFN1FVRkRXanRCUVVOQkxHRkJRVlVzUTBGQlZqdEJRVU5CTEdGQlFWVXNVMEZCVml4RFFVRnZRaXhIUVVGd1FpeERRVUYzUWl4UlFVRjRRanRCUVVOQkxGbEJRVk1zVTBGQlZDeERRVUZ0UWl4TlFVRnVRaXhEUVVFd1FpeFJRVUV4UWpzN1FVRkZRVHRCUVVOQk8wRkJRMFFzUlVGVVJEczdRVUZYUVN4VlFVRlRMR2RDUVVGVUxFTkJRVEJDTEU5QlFURkNMRVZCUVcxRExGbEJRVTA3UVVGRGVFTXNUVUZCU1N4RFFVRkRMRTlCUVV3c1JVRkJZenRCUVVOaU8wRkJRMEVzWVVGQlZTeERRVUZXTzBGQlEwRXNXVUZCVXl4VFFVRlVMRU5CUVcxQ0xFZEJRVzVDTEVOQlFYVkNMRkZCUVhaQ08wRkJRMEVzWVVGQlZTeFRRVUZXTEVOQlFXOUNMRTFCUVhCQ0xFTkJRVEpDTEZGQlFUTkNPenRCUVVWQk8wRkJRMEU3UVVGRFJDeEZRVlJFTzBGQlZVRXNRMEY0UWtRN08wRkJNRUpCTEVsQlFVMHNaVUZCWlN4VFFVRm1MRmxCUVdVc1EwRkJReXhaUVVGRUxFVkJRV3RDTzBGQlEzUkRMRXRCUVVrc1YwRkJWeXhOUVVGTkxFbEJRVTRzUTBGQlZ5eFRRVUZUTEdkQ1FVRlVMRU5CUVRCQ0xGbEJRVEZDTEVOQlFWZ3NRMEZCWmp0QlFVTkJMRlZCUVZNc1QwRkJWQ3hEUVVGcFFqdEJRVUZCTEZOQlFWTXNUVUZCVFN4bFFVRk9MRU5CUVhOQ0xFMUJRWFJDTEVOQlFWUTdRVUZCUVN4RlFVRnFRanRCUVVOQkxFTkJTRVE3TzBGQlMwRXNTVUZCVFN4cFFrRkJhVUlzVTBGQmFrSXNZMEZCYVVJc1EwRkJReXhKUVVGRUxFVkJRVlU3UVVGRGFFTXNTMEZCU1N4WFFVRlhMRlZCUVZVc2FVSkJRVllzUjBGQk9FSXNhMEpCUVRkRE8wRkJRMEVzUzBGQlNTeGxRVUZsTEVOQlFVTXNUMEZCUkN4SFFVRlhMR2xDUVVGWUxFZEJRU3RDTEd0Q1FVRnNSRHRCUVVOQkxFdEJRVWtzVjBGQlZ5eE5RVUZOTEVsQlFVNHNRMEZCVnl4VFFVRlRMR2RDUVVGVUxFTkJRVEJDTEZGQlFURkNMRU5CUVZnc1EwRkJaanM3UVVGRlFTeGpRVUZoTEZsQlFXSTdPMEZCUlVFc1VVRkJUeXhUUVVGVExFbEJRVlFzUTBGQll5eHBRa0ZCVXp0QlFVTTNRaXhOUVVGSkxFOUJRVThzVFVGQlRTeHJRa0ZCYWtJN1FVRkRRU3hUUVVGUExFdEJRVXNzVTBGQlRDeERRVUZsTEVOQlFXWXNUVUZCYzBJc1NVRkJkRUlzU1VGQk9FSXNTMEZCU3l4VFFVRk1MRU5CUVdVc1EwRkJaaXhOUVVGelFpeExRVUZMTEZkQlFVd3NSVUZCTTBRN1FVRkRRU3hGUVVoTkxFTkJRVkE3UVVGSlFTeERRVmhFT3p0QlFXTkJMRWxCUVUwc1pVRkJaU3hUUVVGbUxGbEJRV1VzUjBGQlRUdEJRVU14UWl4TFFVRk5MSFZDUVVGMVFpeFRRVUYyUWl4dlFrRkJkVUlzUTBGQlF5eFBRVUZFTEVWQlFWVXNUVUZCVml4RlFVRnhRanRCUVVOcVJDeFZRVUZSTEdkQ1FVRlNMRU5CUVhsQ0xFOUJRWHBDTEVWQlFXdERMRmxCUVUwN1FVRkRka01zVDBGQlRTeGhRVUZoTEZOQlFWTXNZMEZCVkN4RFFVRjNRaXhOUVVGNFFpeERRVUZ1UWp0QlFVTkJMRTlCUVVrc1pVRkJTanM3UVVGRlFTeFBRVUZKTEVOQlFVTXNUMEZCVEN4RlFVRmpPMEZCUTJJc1lVRkJVeXhYUVVGWExFZEJRVmdzUjBGQmFVSXNVMEZCVXl4alFVRlVMRU5CUVhkQ0xHVkJRWGhDTEVOQlFXcENMRWRCUVRSRUxGZEJRVmNzWVVGQldDeERRVUY1UWl4aFFVRjZRaXhEUVVGMVF5eGhRVUYyUXl4RFFVRnhSQ3hoUVVGeVJDeERRVUZ0UlN4elFrRkJia1VzUTBGQk1FWXNZVUZCTVVZc1EwRkJkMGNzTWtKQlFYaEhMRU5CUVhKRk8wRkJRMEVzU1VGR1JDeE5RVVZQTzBGQlEwNHNZVUZCVXl4WFFVRlhMRWRCUVZnc1IwRkJhVUlzVTBGQlV5eGpRVUZVTEVOQlFYZENMR1ZCUVhoQ0xFTkJRV3BDTEVkQlFUUkVMRmRCUVZjc1lVRkJXQ3hEUVVGNVFpeGhRVUY2UWl4RFFVRjFReXhoUVVGMlF5eERRVUZ4UkN4elFrRkJja1FzUTBGQk5FVXNZVUZCTlVVc1EwRkJNRVlzTWtKQlFURkdMRU5CUVhKRk8wRkJRMEU3TzBGQlJVUXNWVUZCVHl4alFVRlFMRU5CUVhOQ0xFVkJRVU1zVlVGQlZTeFJRVUZZTEVWQlFYRkNMRTlCUVU4c1QwRkJOVUlzUlVGQmRFSTdRVUZEUVN4SFFWaEVPMEZCV1VFc1JVRmlSRHM3UVVGbFFTeExRVUZKTEdkQ1FVRm5RaXhGUVVGd1FqdEJRVU5CTEV0QlFVa3NVMEZCVXl4VFFVRlRMR0ZCUVZRc1EwRkJkVUlzYjBKQlFYWkNMRU5CUVdJN1FVRkRRU3hSUVVGUExGTkJRVkFzUjBGQmJVSXNSVUZCYmtJN08wRkJSVUVzY1VKQlFWTXNUMEZCVkN4RFFVRnBRaXhyUWtGQlZUdEJRVU14UWl4TlFVRkpMR05CUVdNc1pVRkJaU3hOUVVGbUxFTkJRV3hDTzBGQlEwRXNUVUZCU1N4VlFVRlZMRk5CUVZNc1lVRkJWQ3hEUVVGMVFpeEhRVUYyUWl4RFFVRmtPenRCUVVWQkxFMUJRVWtzUTBGQlF5eFhRVUZNTEVWQlFXdENPenRCUVVWc1FpeGpRVUZaTEVWQlFWb3NSMEZCYVVJc1RVRkJha0k3UVVGRFFTeFZRVUZSTEZOQlFWSXNSMEZCYjBJc1QwRkJUeXhYUVVGUUxFVkJRWEJDTzBGQlEwRXNWVUZCVVN4VFFVRlNMRWRCUVc5Q0xIbENRVUZ3UWpzN1FVRkZRU3gxUWtGQmNVSXNUMEZCY2tJc1JVRkJPRUlzVFVGQk9VSTdRVUZEUVN4VFFVRlBMRmRCUVZBc1EwRkJiVUlzVDBGQmJrSTdRVUZEUVN4RlFWcEVPMEZCWVVFc1EwRnFRMFE3TzBGQmJVTkJMRWxCUVUwc1pVRkJaU3hUUVVGbUxGbEJRV1VzUTBGQlF5eE5RVUZFTEVWQlFWTXNUMEZCVkN4RlFVRnhRanRCUVVONlF5eFJRVUZQTEU5QlFWQXNRMEZCWlN4cFFrRkJVenRCUVVOMlFpeE5RVUZOTEN0Q1FVRTJRaXhMUVVGdVF6dEJRVU5CTEUxQlFVMHNXVUZCV1N4VFFVRlRMR0ZCUVZRc1EwRkJkVUlzUzBGQmRrSXNRMEZCYkVJN1FVRkRRU3hOUVVGTkxFOUJRVThzVTBGQlV5eGhRVUZVTEVOQlFYVkNMRXRCUVhaQ0xFTkJRV0k3UVVGRFFTeFBRVUZMTEZOQlFVd3NSMEZCYVVJc1pVRkJha0k3UVVGRFFTeFBRVUZMTEVkQlFVd3NSMEZCVnl4SFFVRllPMEZCUTBFc1dVRkJWU3hYUVVGV0xFTkJRWE5DTEVsQlFYUkNPMEZCUTBFc1ZVRkJVU3hYUVVGU0xFTkJRVzlDTEZOQlFYQkNPMEZCUTBFc1JVRlNSRHRCUVZOQkxFTkJWa1E3TzBGQldVRXNTVUZCVFN4blFrRkJaMElzVTBGQmFFSXNZVUZCWjBJc1IwRkJUVHRCUVVNelFpeExRVUZOTEdWQlFXVXNVMEZCVXl4alFVRlVMRU5CUVhkQ0xGTkJRWGhDTEVOQlFYSkNPMEZCUTBFc1MwRkJUU3hqUVVGakxGVkJRVlVzVVVGQlVTeFBRVUZzUWl4SFFVRTBRaXhSUVVGUkxGRkJRWGhFT3p0QlFVVkJMR05CUVdFc1UwRkJZaXhIUVVGNVFpeEZRVUY2UWpzN1FVRkZRU3hoUVVGWkxFOUJRVm9zUTBGQmIwSXNhVUpCUVZNN1FVRkJRU3hOUVVOd1FpeExRVVJ2UWl4SFFVTjNReXhMUVVSNFF5eERRVU53UWl4TFFVUnZRanRCUVVGQkxFMUJRMklzVVVGRVlTeEhRVU4zUXl4TFFVUjRReXhEUVVOaUxGRkJSR0U3UVVGQlFTeE5RVU5JTEZOQlJFY3NSMEZEZDBNc1MwRkVlRU1zUTBGRFNDeFRRVVJITzBGQlFVRXNUVUZEVVN4TlFVUlNMRWRCUTNkRExFdEJSSGhETEVOQlExRXNUVUZFVWp0QlFVRkJMRTFCUTJkQ0xGZEJSR2hDTEVkQlEzZERMRXRCUkhoRExFTkJRMmRDTEZkQlJHaENPMEZCUVVFc1RVRkROa0lzVFVGRU4wSXNSMEZEZDBNc1MwRkVlRU1zUTBGRE5rSXNUVUZFTjBJN096dEJRVWMxUWl4bFFVRmhMR3RDUVVGaUxFTkJRV2RETEZkQlFXaERMRVZCUVRaRExEQkNRVUUzUXpzN1FVRkZRU3hOUVVGTkxHTkJRV01zVTBGQlV5eG5Ra0ZCVkN4RFFVRXdRaXgzUWtGQk1VSXNRMEZCY0VJN1FVRkRRU3hOUVVGTkxGVkJRVlVzV1VGQldTeFpRVUZaTEUxQlFWb3NSMEZCY1VJc1EwRkJha01zUTBGQmFFSTdRVUZEUVRzN1FVRkZRU3hOUVVGSkxFOUJRVThzVFVGQldDeEZRVUZ0UWl4aFFVRmhMRTFCUVdJc1JVRkJjVUlzVDBGQmNrSTdPMEZCUlc1Q0xFMUJRVTBzYjBKQlFXOUNMRk5CUVZNc1lVRkJWQ3hEUVVGMVFpeExRVUYyUWl4RFFVRXhRanRCUVVOQkxFMUJRVTBzYlVKQlFXMUNMRk5CUVZNc1lVRkJWQ3hEUVVGMVFpeEhRVUYyUWl4RFFVRjZRanRCUVVOQkxFMUJRVTBzWTBGQll5eFRRVUZUTEdGQlFWUXNRMEZCZFVJc1IwRkJka0lzUTBGQmNFSTdRVUZEUVN4dlFrRkJhMElzVTBGQmJFSXNRMEZCTkVJc1IwRkJOVUlzUTBGQlowTXNORUpCUVdoRE8wRkJRMEVzYlVKQlFXbENMRk5CUVdwQ0xFTkJRVEpDTEVkQlFUTkNMRU5CUVN0Q0xIRkNRVUV2UWp0QlFVTkJMR05CUVZrc1UwRkJXaXhEUVVGelFpeEhRVUYwUWl4RFFVRXdRaXhuUWtGQk1VSTdPMEZCUlVFc2JVSkJRV2xDTEZOQlFXcENMRWRCUVRaQ0xGZEJRVGRDTzBGQlEwRXNZMEZCV1N4VFFVRmFMRWRCUVhkQ0xFMUJRWGhDT3p0QlFVVkJMRzlDUVVGclFpeFhRVUZzUWl4RFFVRTRRaXhuUWtGQk9VSXNSVUZCWjBRc1YwRkJhRVE3UVVGRFFTeFZRVUZSTEZkQlFWSXNRMEZCYjBJc2FVSkJRWEJDT3p0QlFVVkJMRTFCUVUwc1kwRkJZeXhUUVVGVExHZENRVUZVTEVOQlFUQkNMSGxDUVVFeFFpeERRVUZ3UWp0QlFVTkJMRTFCUVUwc1UwRkJVeXhaUVVGWkxGbEJRVmtzVFVGQldpeEhRVUZ4UWl4RFFVRnFReXhEUVVGbU96dEJRVVZCTEUxQlFVMHNZMEZCWXl4VFFVRlRMR2RDUVVGVUxFTkJRVEJDTEN0Q1FVRXhRaXhEUVVGd1FqdEJRVU5CTEUxQlFVMHNVMEZCVXl4WlFVRlpMRmxCUVZrc1RVRkJXaXhIUVVGeFFpeERRVUZxUXl4RFFVRm1PenRCUVVWQkxFMUJRVTBzWVVGQllTeFRRVUZUTEdkQ1FVRlVMRU5CUVRCQ0xEaENRVUV4UWl4RFFVRnVRanRCUVVOQkxFMUJRVTBzVVVGQlVTeFhRVUZYTEZkQlFWY3NUVUZCV0N4SFFVRnZRaXhEUVVFdlFpeERRVUZrT3p0QlFVVkJMRk5CUVU4c1UwRkJVQ3hIUVVGdFFpeExRVUZ1UWp0QlFVTkJMRk5CUVU4c1UwRkJVQ3hIUVVGdFFpeFRRVUZ1UWp0QlFVTkJMRkZCUVUwc1UwRkJUaXhIUVVGclFpeFJRVUZzUWpzN1FVRkZRU3hOUVVGTkxHRkJRV0VzVVVGQlVTeGhRVUZTTEVOQlFYTkNMR0ZCUVhSQ0xFTkJRVzlETEdGQlFYQkRMRU5CUVc1Q08wRkJRMEVzVFVGQlRTeGhRVUZoTEZGQlFWRXNZVUZCVWl4RFFVRnpRaXhoUVVGMFFpeERRVUZ2UXl4aFFVRndReXhEUVVGdVFqczdRVUZGUVN4TlFVRkpMRlZCUVZVc1VVRkJVU3hwUWtGQmRFSTdRVUZEUVN4aFFVRlhMR2RDUVVGWUxFTkJRVFJDTEU5QlFUVkNMRVZCUVhGRExGbEJRVTA3UVVGRE1VTXNUMEZCVFN4UFFVRlBMRkZCUVZFc2EwSkJRWEpDTzBGQlEwRXNUMEZCU1N4SlFVRktMRVZCUVZVN1FVRkRWQ3hUUVVGTExHTkJRVXdzUTBGQmIwSXNSVUZCUXl4VlFVRlZMRkZCUVZnc1JVRkJjVUlzVDBGQlR5eFRRVUUxUWl4RlFVRjFReXhSUVVGUkxGRkJRUzlETEVWQlFYQkNPMEZCUTBFc1kwRkJWU3hKUVVGV08wRkJRMEU3UVVGRFJDeEhRVTVFT3p0QlFWRkJMR0ZCUVZjc1owSkJRVmdzUTBGQk5FSXNUMEZCTlVJc1JVRkJjVU1zV1VGQlRUdEJRVU14UXl4UFFVRk5MRTlCUVU4c1VVRkJVU3h6UWtGQmNrSTdRVUZEUVN4UFFVRkpMRWxCUVVvc1JVRkJWVHRCUVVOVUxGTkJRVXNzWTBGQlRDeERRVUZ2UWl4RlFVRkRMRlZCUVZVc1VVRkJXQ3hGUVVGeFFpeFBRVUZQTEZOQlFUVkNMRVZCUVhWRExGRkJRVkVzVVVGQkwwTXNSVUZCY0VJN1FVRkRRU3hqUVVGVkxFbEJRVlk3UVVGRFFUdEJRVU5FTEVkQlRrUTdRVUZQUVN4RlFYaEVSRHM3UVVFd1JFRTdRVUZEUVR0QlFVTkJMRU5CYkVWRU96dEJRVzlGUVR0QlFVTkJMRWxCUVUwc1kwRkJZeXhUUVVGa0xGZEJRV01zUjBGQlRUdEJRVU42UWl4VFFVRlJMRTlCUVZJc1EwRkJaMElzU1VGQmFFSXNRMEZCY1VJc1ZVRkJReXhEUVVGRUxFVkJRVWtzUTBGQlNpeEZRVUZWTzBGQlF6bENMRTFCUVVrc1UwRkJVeXhGUVVGRkxFdEJRVVlzUTBGQlVTeERRVUZTTEVWQlFWY3NWMEZCV0N4RlFVRmlPMEZCUTBFc1RVRkJTU3hUUVVGVExFVkJRVVVzUzBGQlJpeERRVUZSTEVOQlFWSXNSVUZCVnl4WFFVRllMRVZCUVdJN1FVRkRRU3hOUVVGSkxGTkJRVk1zVFVGQllpeEZRVUZ4UWl4UFFVRlBMRU5CUVZBc1EwRkJja0lzUzBGRFN5eEpRVUZKTEZOQlFWTXNUVUZCWWl4RlFVRnhRaXhQUVVGUExFTkJRVU1zUTBGQlVpeERRVUZ5UWl4TFFVTkJMRTlCUVU4c1EwRkJVRHRCUVVOTUxFVkJUa1E3UVVGUFFTeERRVkpFT3p0QlFWVkJMRWxCUVUwc1ZVRkJWU3hUUVVGV0xFOUJRVlVzUTBGQlF5eEpRVUZFTEVWQlFWVTdRVUZEZWtJc1UwRkJVU3hSUVVGU0xFZEJRVzFDTEVsQlFXNUNPMEZCUTBFc1UwRkJVU3hQUVVGU0xFZEJRV3RDTEV0QlFVc3NTMEZCVEN4RlFVRnNRaXhEUVVaNVFpeERRVVZQT3p0QlFVVm9RenRCUVVOQk8wRkJRMEVzUTBGT1JEczdRVUZSUVN4SlFVRk5MRmxCUVZrc1UwRkJXaXhUUVVGWkxFZEJRVTA3UVVGRGRrSXNUMEZCVFN4aFFVRk9MRVZCUVZVc1NVRkJWaXhEUVVGbE8wRkJRVUVzVTBGQlR5eEpRVUZKTEVsQlFVb3NSVUZCVUR0QlFVRkJMRVZCUVdZc1JVRkRReXhKUVVSRUxFTkJRMDBzWjBKQlFWRTdRVUZEWWl4VlFVRlJMRWxCUVZJN1FVRkRRVHRCUVVOQkxFVkJTa1FzUlVGTFF5eExRVXhFTEVOQlMwODdRVUZCUVN4VFFVRlBMRkZCUVZFc1NVRkJVaXhEUVVGaExFZEJRV0lzUTBGQlVEdEJRVUZCTEVWQlRGQTdRVUZOUVN4RFFWQkVPenRCUVZOQkxFbEJRVTBzVDBGQlR5eFRRVUZRTEVsQlFVOHNSMEZCVFR0QlFVTnNRaXhuUTBGQllTeFJRVUZpTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQkxFTkJVRVE3TzBGQlUwRTdPenM3T3pzN08wRkRPVkpCTEVsQlFVMHNPREJDUVVGT096dHJRa0YxUW1Vc1pUczdPenM3T3pzN096dEJRM1pDWmpzN096dEJRVU5CT3pzN096czdVVUZGVXl4bExFZEJRVUVzYVVJN1VVRkJhVUlzU3l4SFFVRkJMR1U3T3pzN096czdPMEZEU0RGQ0xFbEJRVTBzYlcxQ1FVRk9PenRCUVdsQ1FTeEpRVUZOTEZGQlFWRXNVMEZCVWl4TFFVRlJMRWRCUVUwN1FVRkRia0lzUzBGQlNTeFhRVUZYTEZOQlFWTXNZMEZCVkN4RFFVRjNRaXhSUVVGNFFpeERRVUZtTzBGQlEwRXNWVUZCVXl4VFFVRlVMRWRCUVhGQ0xGRkJRWEpDTzBGQlEwRXNRMEZJUkRzN2EwSkJTMlVzU3pzN096czdPenM3T3p0QlEzUkNaanM3UVVGRlFTeEpRVUZOTEZkQlFWY3NVMEZCV0N4UlFVRlhMRU5CUVVNc1JVRkJSQ3hGUVVGTExFbEJRVXdzUlVGQll6dEJRVU0zUWl4TlFVRkpMR2RDUVVGS096dEJRVVZCTEZOQlFVOHNXVUZCVnp0QlFVRkJPMEZCUVVFN08wRkJRMmhDTEZGQlFVMHNaVUZCWlN4VFFVRm1MRmxCUVdVN1FVRkJRU3hoUVVGTkxFZEJRVWNzUzBGQlNDeERRVUZUTEV0QlFWUXNSVUZCWlN4VlFVRm1MRU5CUVU0N1FVRkJRU3hMUVVGeVFqczdRVUZGUVN4cFFrRkJZU3hQUVVGaU8wRkJRMEVzWTBGQlZTeFhRVUZYTEZsQlFWZ3NSVUZCZVVJc1NVRkJla0lzUTBGQlZqdEJRVU5FTEVkQlRFUTdRVUZOUkN4RFFWUkVPenRCUVZkQkxFbEJRVTBzWTBGQll5eFRRVUZrTEZkQlFXTXNSMEZCVFR0QlFVTjZRaXh6UWtGQlV5eFBRVUZVTEVOQlFXbENMR2RDUVVGUk8wRkJRM2hDTEZOQlFVc3NVMEZCVEN4RFFVRmxMRTFCUVdZc1EwRkJjMElzVTBGQmRFSTdRVUZEUVN4VFFVRkxMRk5CUVV3c1EwRkJaU3hIUVVGbUxFTkJRVzFDTEU5QlFXNUNPMEZCUTBFc1IwRklSRHRCUVVsQkxHdENRVUZMTEZOQlFVd3NRMEZCWlN4SFFVRm1MRU5CUVcxQ0xFOUJRVzVDTzBGQlEwRXNRMEZPUkRzN1VVRlJVeXhSTEVkQlFVRXNVVHRSUVVGVkxGY3NSMEZCUVN4WElpd2labWxzWlNJNkltZGxibVZ5WVhSbFpDNXFjeUlzSW5OdmRYSmpaVkp2YjNRaU9pSWlMQ0p6YjNWeVkyVnpRMjl1ZEdWdWRDSTZXeUlvWm5WdVkzUnBiMjRvS1h0bWRXNWpkR2x2YmlCeUtHVXNiaXgwS1h0bWRXNWpkR2x2YmlCdktHa3NaaWw3YVdZb0lXNWJhVjBwZTJsbUtDRmxXMmxkS1h0MllYSWdZejFjSW1aMWJtTjBhVzl1WENJOVBYUjVjR1Z2WmlCeVpYRjFhWEpsSmlaeVpYRjFhWEpsTzJsbUtDRm1KaVpqS1hKbGRIVnliaUJqS0drc0lUQXBPMmxtS0hVcGNtVjBkWEp1SUhVb2FTd2hNQ2s3ZG1GeUlHRTlibVYzSUVWeWNtOXlLRndpUTJGdWJtOTBJR1pwYm1RZ2JXOWtkV3hsSUNkY0lpdHBLMXdpSjF3aUtUdDBhSEp2ZHlCaExtTnZaR1U5WENKTlQwUlZURVZmVGs5VVgwWlBWVTVFWENJc1lYMTJZWElnY0QxdVcybGRQWHRsZUhCdmNuUnpPbnQ5ZlR0bFcybGRXekJkTG1OaGJHd29jQzVsZUhCdmNuUnpMR1oxYm1OMGFXOXVLSElwZTNaaGNpQnVQV1ZiYVYxYk1WMWJjbDA3Y21WMGRYSnVJRzhvYm54OGNpbDlMSEFzY0M1bGVIQnZjblJ6TEhJc1pTeHVMSFFwZlhKbGRIVnliaUJ1VzJsZExtVjRjRzl5ZEhOOVptOXlLSFpoY2lCMVBWd2lablZ1WTNScGIyNWNJajA5ZEhsd1pXOW1JSEpsY1hWcGNtVW1KbkpsY1hWcGNtVXNhVDB3TzJrOGRDNXNaVzVuZEdnN2FTc3JLVzhvZEZ0cFhTazdjbVYwZFhKdUlHOTljbVYwZFhKdUlISjlLU2dwSWl3aUx5b2djMjF2YjNSb2MyTnliMnhzSUhZd0xqUXVNQ0F0SURJd01UZ2dMU0JFZFhOMFlXNGdTMkZ6ZEdWdUxDQktaWEpsYldsaGN5Qk5aVzVwWTJobGJHeHBJQzBnVFVsVUlFeHBZMlZ1YzJVZ0tpOWNiaWhtZFc1amRHbHZiaUFvS1NCN1hHNGdJQ2QxYzJVZ2MzUnlhV04wSnp0Y2JseHVJQ0F2THlCd2IyeDVabWxzYkZ4dUlDQm1kVzVqZEdsdmJpQndiMng1Wm1sc2JDZ3BJSHRjYmlBZ0lDQXZMeUJoYkdsaGMyVnpYRzRnSUNBZ2RtRnlJSGNnUFNCM2FXNWtiM2M3WEc0Z0lDQWdkbUZ5SUdRZ1BTQmtiMk4xYldWdWREdGNibHh1SUNBZ0lDOHZJSEpsZEhWeWJpQnBaaUJ6WTNKdmJHd2dZbVZvWVhacGIzSWdhWE1nYzNWd2NHOXlkR1ZrSUdGdVpDQndiMng1Wm1sc2JDQnBjeUJ1YjNRZ1ptOXlZMlZrWEc0Z0lDQWdhV1lnS0Z4dUlDQWdJQ0FnSjNOamNtOXNiRUpsYUdGMmFXOXlKeUJwYmlCa0xtUnZZM1Z0Wlc1MFJXeGxiV1Z1ZEM1emRIbHNaU0FtSmx4dUlDQWdJQ0FnZHk1ZlgyWnZjbU5sVTIxdmIzUm9VMk55YjJ4c1VHOXNlV1pwYkd4Zlh5QWhQVDBnZEhKMVpWeHVJQ0FnSUNrZ2UxeHVJQ0FnSUNBZ2NtVjBkWEp1TzF4dUlDQWdJSDFjYmx4dUlDQWdJQzh2SUdkc2IySmhiSE5jYmlBZ0lDQjJZWElnUld4bGJXVnVkQ0E5SUhjdVNGUk5URVZzWlcxbGJuUWdmSHdnZHk1RmJHVnRaVzUwTzF4dUlDQWdJSFpoY2lCVFExSlBURXhmVkVsTlJTQTlJRFEyT0R0Y2JseHVJQ0FnSUM4dklHOWlhbVZqZENCbllYUm9aWEpwYm1jZ2IzSnBaMmx1WVd3Z2MyTnliMnhzSUcxbGRHaHZaSE5jYmlBZ0lDQjJZWElnYjNKcFoybHVZV3dnUFNCN1hHNGdJQ0FnSUNCelkzSnZiR3c2SUhjdWMyTnliMnhzSUh4OElIY3VjMk55YjJ4c1ZHOHNYRzRnSUNBZ0lDQnpZM0p2Ykd4Q2VUb2dkeTV6WTNKdmJHeENlU3hjYmlBZ0lDQWdJR1ZzWlcxbGJuUlRZM0p2Ykd3NklFVnNaVzFsYm5RdWNISnZkRzkwZVhCbExuTmpjbTlzYkNCOGZDQnpZM0p2Ykd4RmJHVnRaVzUwTEZ4dUlDQWdJQ0FnYzJOeWIyeHNTVzUwYjFacFpYYzZJRVZzWlcxbGJuUXVjSEp2ZEc5MGVYQmxMbk5qY205c2JFbHVkRzlXYVdWM1hHNGdJQ0FnZlR0Y2JseHVJQ0FnSUM4dklHUmxabWx1WlNCMGFXMXBibWNnYldWMGFHOWtYRzRnSUNBZ2RtRnlJRzV2ZHlBOVhHNGdJQ0FnSUNCM0xuQmxjbVp2Y20xaGJtTmxJQ1ltSUhjdWNHVnlabTl5YldGdVkyVXVibTkzWEc0Z0lDQWdJQ0FnSUQ4Z2R5NXdaWEptYjNKdFlXNWpaUzV1YjNjdVltbHVaQ2gzTG5CbGNtWnZjbTFoYm1ObEtWeHVJQ0FnSUNBZ0lDQTZJRVJoZEdVdWJtOTNPMXh1WEc0Z0lDQWdMeW9xWEc0Z0lDQWdJQ29nYVc1a2FXTmhkR1Z6SUdsbUlHRWdkR2hsSUdOMWNuSmxiblFnWW5KdmQzTmxjaUJwY3lCdFlXUmxJR0o1SUUxcFkzSnZjMjltZEZ4dUlDQWdJQ0FxSUVCdFpYUm9iMlFnYVhOTmFXTnliM052Wm5SQ2NtOTNjMlZ5WEc0Z0lDQWdJQ29nUUhCaGNtRnRJSHRUZEhKcGJtZDlJSFZ6WlhKQloyVnVkRnh1SUNBZ0lDQXFJRUJ5WlhSMWNtNXpJSHRDYjI5c1pXRnVmVnh1SUNBZ0lDQXFMMXh1SUNBZ0lHWjFibU4wYVc5dUlHbHpUV2xqY205emIyWjBRbkp2ZDNObGNpaDFjMlZ5UVdkbGJuUXBJSHRjYmlBZ0lDQWdJSFpoY2lCMWMyVnlRV2RsYm5SUVlYUjBaWEp1Y3lBOUlGc25UVk5KUlNBbkxDQW5WSEpwWkdWdWRDOG5MQ0FuUldSblpTOG5YVHRjYmx4dUlDQWdJQ0FnY21WMGRYSnVJRzVsZHlCU1pXZEZlSEFvZFhObGNrRm5aVzUwVUdGMGRHVnlibk11YW05cGJpZ25mQ2NwS1M1MFpYTjBLSFZ6WlhKQloyVnVkQ2s3WEc0Z0lDQWdmVnh1WEc0Z0lDQWdMeXBjYmlBZ0lDQWdLaUJKUlNCb1lYTWdjbTkxYm1ScGJtY2dZblZuSUhKdmRXNWthVzVuSUdSdmQyNGdZMnhwWlc1MFNHVnBaMmgwSUdGdVpDQmpiR2xsYm5SWGFXUjBhQ0JoYm1SY2JpQWdJQ0FnS2lCeWIzVnVaR2x1WnlCMWNDQnpZM0p2Ykd4SVpXbG5hSFFnWVc1a0lITmpjbTlzYkZkcFpIUm9JR05oZFhOcGJtY2dabUZzYzJVZ2NHOXphWFJwZG1WelhHNGdJQ0FnSUNvZ2IyNGdhR0Z6VTJOeWIyeHNZV0pzWlZOd1lXTmxYRzRnSUNBZ0lDb3ZYRzRnSUNBZ2RtRnlJRkpQVlU1RVNVNUhYMVJQVEVWU1FVNURSU0E5SUdselRXbGpjbTl6YjJaMFFuSnZkM05sY2loM0xtNWhkbWxuWVhSdmNpNTFjMlZ5UVdkbGJuUXBJRDhnTVNBNklEQTdYRzVjYmlBZ0lDQXZLaXBjYmlBZ0lDQWdLaUJqYUdGdVoyVnpJSE5qY205c2JDQndiM05wZEdsdmJpQnBibk5wWkdVZ1lXNGdaV3hsYldWdWRGeHVJQ0FnSUNBcUlFQnRaWFJvYjJRZ2MyTnliMnhzUld4bGJXVnVkRnh1SUNBZ0lDQXFJRUJ3WVhKaGJTQjdUblZ0WW1WeWZTQjRYRzRnSUNBZ0lDb2dRSEJoY21GdElIdE9kVzFpWlhKOUlIbGNiaUFnSUNBZ0tpQkFjbVYwZFhKdWN5QjdkVzVrWldacGJtVmtmVnh1SUNBZ0lDQXFMMXh1SUNBZ0lHWjFibU4wYVc5dUlITmpjbTlzYkVWc1pXMWxiblFvZUN3Z2VTa2dlMXh1SUNBZ0lDQWdkR2hwY3k1elkzSnZiR3hNWldaMElEMGdlRHRjYmlBZ0lDQWdJSFJvYVhNdWMyTnliMnhzVkc5d0lEMGdlVHRjYmlBZ0lDQjlYRzVjYmlBZ0lDQXZLaXBjYmlBZ0lDQWdLaUJ5WlhSMWNtNXpJSEpsYzNWc2RDQnZaaUJoY0hCc2VXbHVaeUJsWVhObElHMWhkR2dnWm5WdVkzUnBiMjRnZEc4Z1lTQnVkVzFpWlhKY2JpQWdJQ0FnS2lCQWJXVjBhRzlrSUdWaGMyVmNiaUFnSUNBZ0tpQkFjR0Z5WVcwZ2UwNTFiV0psY24wZ2ExeHVJQ0FnSUNBcUlFQnlaWFIxY201eklIdE9kVzFpWlhKOVhHNGdJQ0FnSUNvdlhHNGdJQ0FnWm5WdVkzUnBiMjRnWldGelpTaHJLU0I3WEc0Z0lDQWdJQ0J5WlhSMWNtNGdNQzQxSUNvZ0tERWdMU0JOWVhSb0xtTnZjeWhOWVhSb0xsQkpJQ29nYXlrcE8xeHVJQ0FnSUgxY2JseHVJQ0FnSUM4cUtseHVJQ0FnSUNBcUlHbHVaR2xqWVhSbGN5QnBaaUJoSUhOdGIyOTBhQ0JpWldoaGRtbHZjaUJ6YUc5MWJHUWdZbVVnWVhCd2JHbGxaRnh1SUNBZ0lDQXFJRUJ0WlhSb2IyUWdjMmh2ZFd4a1FtRnBiRTkxZEZ4dUlDQWdJQ0FxSUVCd1lYSmhiU0I3VG5WdFltVnlmRTlpYW1WamRIMGdabWx5YzNSQmNtZGNiaUFnSUNBZ0tpQkFjbVYwZFhKdWN5QjdRbTl2YkdWaGJuMWNiaUFnSUNBZ0tpOWNiaUFnSUNCbWRXNWpkR2x2YmlCemFHOTFiR1JDWVdsc1QzVjBLR1pwY25OMFFYSm5LU0I3WEc0Z0lDQWdJQ0JwWmlBb1hHNGdJQ0FnSUNBZ0lHWnBjbk4wUVhKbklEMDlQU0J1ZFd4c0lIeDhYRzRnSUNBZ0lDQWdJSFI1Y0dWdlppQm1hWEp6ZEVGeVp5QWhQVDBnSjI5aWFtVmpkQ2NnZkh4Y2JpQWdJQ0FnSUNBZ1ptbHljM1JCY21jdVltVm9ZWFpwYjNJZ1BUMDlJSFZ1WkdWbWFXNWxaQ0I4ZkZ4dUlDQWdJQ0FnSUNCbWFYSnpkRUZ5Wnk1aVpXaGhkbWx2Y2lBOVBUMGdKMkYxZEc4bklIeDhYRzRnSUNBZ0lDQWdJR1pwY25OMFFYSm5MbUpsYUdGMmFXOXlJRDA5UFNBbmFXNXpkR0Z1ZENkY2JpQWdJQ0FnSUNrZ2UxeHVJQ0FnSUNBZ0lDQXZMeUJtYVhKemRDQmhjbWQxYldWdWRDQnBjeUJ1YjNRZ1lXNGdiMkpxWldOMEwyNTFiR3hjYmlBZ0lDQWdJQ0FnTHk4Z2IzSWdZbVZvWVhacGIzSWdhWE1nWVhWMGJ5d2dhVzV6ZEdGdWRDQnZjaUIxYm1SbFptbHVaV1JjYmlBZ0lDQWdJQ0FnY21WMGRYSnVJSFJ5ZFdVN1hHNGdJQ0FnSUNCOVhHNWNiaUFnSUNBZ0lHbG1JQ2gwZVhCbGIyWWdabWx5YzNSQmNtY2dQVDA5SUNkdlltcGxZM1FuSUNZbUlHWnBjbk4wUVhKbkxtSmxhR0YyYVc5eUlEMDlQU0FuYzIxdmIzUm9KeWtnZTF4dUlDQWdJQ0FnSUNBdkx5Qm1hWEp6ZENCaGNtZDFiV1Z1ZENCcGN5QmhiaUJ2WW1wbFkzUWdZVzVrSUdKbGFHRjJhVzl5SUdseklITnRiMjkwYUZ4dUlDQWdJQ0FnSUNCeVpYUjFjbTRnWm1Gc2MyVTdYRzRnSUNBZ0lDQjlYRzVjYmlBZ0lDQWdJQzh2SUhSb2NtOTNJR1Z5Y205eUlIZG9aVzRnWW1Wb1lYWnBiM0lnYVhNZ2JtOTBJSE4xY0hCdmNuUmxaRnh1SUNBZ0lDQWdkR2h5YjNjZ2JtVjNJRlI1Y0dWRmNuSnZjaWhjYmlBZ0lDQWdJQ0FnSjJKbGFHRjJhVzl5SUcxbGJXSmxjaUJ2WmlCVFkzSnZiR3hQY0hScGIyNXpJQ2NnSzF4dUlDQWdJQ0FnSUNBZ0lHWnBjbk4wUVhKbkxtSmxhR0YyYVc5eUlDdGNiaUFnSUNBZ0lDQWdJQ0FuSUdseklHNXZkQ0JoSUhaaGJHbGtJSFpoYkhWbElHWnZjaUJsYm5WdFpYSmhkR2x2YmlCVFkzSnZiR3hDWldoaGRtbHZjaTRuWEc0Z0lDQWdJQ0FwTzF4dUlDQWdJSDFjYmx4dUlDQWdJQzhxS2x4dUlDQWdJQ0FxSUdsdVpHbGpZWFJsY3lCcFppQmhiaUJsYkdWdFpXNTBJR2hoY3lCelkzSnZiR3hoWW14bElITndZV05sSUdsdUlIUm9aU0J3Y205MmFXUmxaQ0JoZUdselhHNGdJQ0FnSUNvZ1FHMWxkR2h2WkNCb1lYTlRZM0p2Ykd4aFlteGxVM0JoWTJWY2JpQWdJQ0FnS2lCQWNHRnlZVzBnZTA1dlpHVjlJR1ZzWEc0Z0lDQWdJQ29nUUhCaGNtRnRJSHRUZEhKcGJtZDlJR0Y0YVhOY2JpQWdJQ0FnS2lCQWNtVjBkWEp1Y3lCN1FtOXZiR1ZoYm4xY2JpQWdJQ0FnS2k5Y2JpQWdJQ0JtZFc1amRHbHZiaUJvWVhOVFkzSnZiR3hoWW14bFUzQmhZMlVvWld3c0lHRjRhWE1wSUh0Y2JpQWdJQ0FnSUdsbUlDaGhlR2x6SUQwOVBTQW5XU2NwSUh0Y2JpQWdJQ0FnSUNBZ2NtVjBkWEp1SUdWc0xtTnNhV1Z1ZEVobGFXZG9kQ0FySUZKUFZVNUVTVTVIWDFSUFRFVlNRVTVEUlNBOElHVnNMbk5qY205c2JFaGxhV2RvZER0Y2JpQWdJQ0FnSUgxY2JseHVJQ0FnSUNBZ2FXWWdLR0Y0YVhNZ1BUMDlJQ2RZSnlrZ2UxeHVJQ0FnSUNBZ0lDQnlaWFIxY200Z1pXd3VZMnhwWlc1MFYybGtkR2dnS3lCU1QxVk9SRWxPUjE5VVQweEZVa0ZPUTBVZ1BDQmxiQzV6WTNKdmJHeFhhV1IwYUR0Y2JpQWdJQ0FnSUgxY2JpQWdJQ0I5WEc1Y2JpQWdJQ0F2S2lwY2JpQWdJQ0FnS2lCcGJtUnBZMkYwWlhNZ2FXWWdZVzRnWld4bGJXVnVkQ0JvWVhNZ1lTQnpZM0p2Ykd4aFlteGxJRzkyWlhKbWJHOTNJSEJ5YjNCbGNuUjVJR2x1SUhSb1pTQmhlR2x6WEc0Z0lDQWdJQ29nUUcxbGRHaHZaQ0JqWVc1UGRtVnlabXh2ZDF4dUlDQWdJQ0FxSUVCd1lYSmhiU0I3VG05a1pYMGdaV3hjYmlBZ0lDQWdLaUJBY0dGeVlXMGdlMU4wY21sdVozMGdZWGhwYzF4dUlDQWdJQ0FxSUVCeVpYUjFjbTV6SUh0Q2IyOXNaV0Z1ZlZ4dUlDQWdJQ0FxTDF4dUlDQWdJR1oxYm1OMGFXOXVJR05oYms5MlpYSm1iRzkzS0dWc0xDQmhlR2x6S1NCN1hHNGdJQ0FnSUNCMllYSWdiM1psY21ac2IzZFdZV3gxWlNBOUlIY3VaMlYwUTI5dGNIVjBaV1JUZEhsc1pTaGxiQ3dnYm5Wc2JDbGJKMjkyWlhKbWJHOTNKeUFySUdGNGFYTmRPMXh1WEc0Z0lDQWdJQ0J5WlhSMWNtNGdiM1psY21ac2IzZFdZV3gxWlNBOVBUMGdKMkYxZEc4bklIeDhJRzkyWlhKbWJHOTNWbUZzZFdVZ1BUMDlJQ2R6WTNKdmJHd25PMXh1SUNBZ0lIMWNibHh1SUNBZ0lDOHFLbHh1SUNBZ0lDQXFJR2x1WkdsallYUmxjeUJwWmlCaGJpQmxiR1Z0Wlc1MElHTmhiaUJpWlNCelkzSnZiR3hsWkNCcGJpQmxhWFJvWlhJZ1lYaHBjMXh1SUNBZ0lDQXFJRUJ0WlhSb2IyUWdhWE5UWTNKdmJHeGhZbXhsWEc0Z0lDQWdJQ29nUUhCaGNtRnRJSHRPYjJSbGZTQmxiRnh1SUNBZ0lDQXFJRUJ3WVhKaGJTQjdVM1J5YVc1bmZTQmhlR2x6WEc0Z0lDQWdJQ29nUUhKbGRIVnlibk1nZTBKdmIyeGxZVzU5WEc0Z0lDQWdJQ292WEc0Z0lDQWdablZ1WTNScGIyNGdhWE5UWTNKdmJHeGhZbXhsS0dWc0tTQjdYRzRnSUNBZ0lDQjJZWElnYVhOVFkzSnZiR3hoWW14bFdTQTlJR2hoYzFOamNtOXNiR0ZpYkdWVGNHRmpaU2hsYkN3Z0oxa25LU0FtSmlCallXNVBkbVZ5Wm14dmR5aGxiQ3dnSjFrbktUdGNiaUFnSUNBZ0lIWmhjaUJwYzFOamNtOXNiR0ZpYkdWWUlEMGdhR0Z6VTJOeWIyeHNZV0pzWlZOd1lXTmxLR1ZzTENBbldDY3BJQ1ltSUdOaGJrOTJaWEptYkc5M0tHVnNMQ0FuV0NjcE8xeHVYRzRnSUNBZ0lDQnlaWFIxY200Z2FYTlRZM0p2Ykd4aFlteGxXU0I4ZkNCcGMxTmpjbTlzYkdGaWJHVllPMXh1SUNBZ0lIMWNibHh1SUNBZ0lDOHFLbHh1SUNBZ0lDQXFJR1pwYm1SeklITmpjbTlzYkdGaWJHVWdjR0Z5Wlc1MElHOW1JR0Z1SUdWc1pXMWxiblJjYmlBZ0lDQWdLaUJBYldWMGFHOWtJR1pwYm1SVFkzSnZiR3hoWW14bFVHRnlaVzUwWEc0Z0lDQWdJQ29nUUhCaGNtRnRJSHRPYjJSbGZTQmxiRnh1SUNBZ0lDQXFJRUJ5WlhSMWNtNXpJSHRPYjJSbGZTQmxiRnh1SUNBZ0lDQXFMMXh1SUNBZ0lHWjFibU4wYVc5dUlHWnBibVJUWTNKdmJHeGhZbXhsVUdGeVpXNTBLR1ZzS1NCN1hHNGdJQ0FnSUNCMllYSWdhWE5DYjJSNU8xeHVYRzRnSUNBZ0lDQmtieUI3WEc0Z0lDQWdJQ0FnSUdWc0lEMGdaV3d1Y0dGeVpXNTBUbTlrWlR0Y2JseHVJQ0FnSUNBZ0lDQnBjMEp2WkhrZ1BTQmxiQ0E5UFQwZ1pDNWliMlI1TzF4dUlDQWdJQ0FnZlNCM2FHbHNaU0FvYVhOQ2IyUjVJRDA5UFNCbVlXeHpaU0FtSmlCcGMxTmpjbTlzYkdGaWJHVW9aV3dwSUQwOVBTQm1ZV3h6WlNrN1hHNWNiaUFnSUNBZ0lHbHpRbTlrZVNBOUlHNTFiR3c3WEc1Y2JpQWdJQ0FnSUhKbGRIVnliaUJsYkR0Y2JpQWdJQ0I5WEc1Y2JpQWdJQ0F2S2lwY2JpQWdJQ0FnS2lCelpXeG1JR2x1ZG05clpXUWdablZ1WTNScGIyNGdkR2hoZEN3Z1oybDJaVzRnWVNCamIyNTBaWGgwTENCemRHVndjeUIwYUhKdmRXZG9JSE5qY205c2JHbHVaMXh1SUNBZ0lDQXFJRUJ0WlhSb2IyUWdjM1JsY0Z4dUlDQWdJQ0FxSUVCd1lYSmhiU0I3VDJKcVpXTjBmU0JqYjI1MFpYaDBYRzRnSUNBZ0lDb2dRSEpsZEhWeWJuTWdlM1Z1WkdWbWFXNWxaSDFjYmlBZ0lDQWdLaTljYmlBZ0lDQm1kVzVqZEdsdmJpQnpkR1Z3S0dOdmJuUmxlSFFwSUh0Y2JpQWdJQ0FnSUhaaGNpQjBhVzFsSUQwZ2JtOTNLQ2s3WEc0Z0lDQWdJQ0IyWVhJZ2RtRnNkV1U3WEc0Z0lDQWdJQ0IyWVhJZ1kzVnljbVZ1ZEZnN1hHNGdJQ0FnSUNCMllYSWdZM1Z5Y21WdWRGazdYRzRnSUNBZ0lDQjJZWElnWld4aGNITmxaQ0E5SUNoMGFXMWxJQzBnWTI5dWRHVjRkQzV6ZEdGeWRGUnBiV1VwSUM4Z1UwTlNUMHhNWDFSSlRVVTdYRzVjYmlBZ0lDQWdJQzh2SUdGMmIybGtJR1ZzWVhCelpXUWdkR2x0WlhNZ2FHbG5hR1Z5SUhSb1lXNGdiMjVsWEc0Z0lDQWdJQ0JsYkdGd2MyVmtJRDBnWld4aGNITmxaQ0ErSURFZ1B5QXhJRG9nWld4aGNITmxaRHRjYmx4dUlDQWdJQ0FnTHk4Z1lYQndiSGtnWldGemFXNW5JSFJ2SUdWc1lYQnpaV1FnZEdsdFpWeHVJQ0FnSUNBZ2RtRnNkV1VnUFNCbFlYTmxLR1ZzWVhCelpXUXBPMXh1WEc0Z0lDQWdJQ0JqZFhKeVpXNTBXQ0E5SUdOdmJuUmxlSFF1YzNSaGNuUllJQ3NnS0dOdmJuUmxlSFF1ZUNBdElHTnZiblJsZUhRdWMzUmhjblJZS1NBcUlIWmhiSFZsTzF4dUlDQWdJQ0FnWTNWeWNtVnVkRmtnUFNCamIyNTBaWGgwTG5OMFlYSjBXU0FySUNoamIyNTBaWGgwTG5rZ0xTQmpiMjUwWlhoMExuTjBZWEowV1NrZ0tpQjJZV3gxWlR0Y2JseHVJQ0FnSUNBZ1kyOXVkR1Y0ZEM1dFpYUm9iMlF1WTJGc2JDaGpiMjUwWlhoMExuTmpjbTlzYkdGaWJHVXNJR04xY25KbGJuUllMQ0JqZFhKeVpXNTBXU2s3WEc1Y2JpQWdJQ0FnSUM4dklITmpjbTlzYkNCdGIzSmxJR2xtSUhkbElHaGhkbVVnYm05MElISmxZV05vWldRZ2IzVnlJR1JsYzNScGJtRjBhVzl1WEc0Z0lDQWdJQ0JwWmlBb1kzVnljbVZ1ZEZnZ0lUMDlJR052Ym5SbGVIUXVlQ0I4ZkNCamRYSnlaVzUwV1NBaFBUMGdZMjl1ZEdWNGRDNTVLU0I3WEc0Z0lDQWdJQ0FnSUhjdWNtVnhkV1Z6ZEVGdWFXMWhkR2x2YmtaeVlXMWxLSE4wWlhBdVltbHVaQ2gzTENCamIyNTBaWGgwS1NrN1hHNGdJQ0FnSUNCOVhHNGdJQ0FnZlZ4dVhHNGdJQ0FnTHlvcVhHNGdJQ0FnSUNvZ2MyTnliMnhzY3lCM2FXNWtiM2NnYjNJZ1pXeGxiV1Z1ZENCM2FYUm9JR0VnYzIxdmIzUm9JR0psYUdGMmFXOXlYRzRnSUNBZ0lDb2dRRzFsZEdodlpDQnpiVzl2ZEdoVFkzSnZiR3hjYmlBZ0lDQWdLaUJBY0dGeVlXMGdlMDlpYW1WamRIeE9iMlJsZlNCbGJGeHVJQ0FnSUNBcUlFQndZWEpoYlNCN1RuVnRZbVZ5ZlNCNFhHNGdJQ0FnSUNvZ1FIQmhjbUZ0SUh0T2RXMWlaWEo5SUhsY2JpQWdJQ0FnS2lCQWNtVjBkWEp1Y3lCN2RXNWtaV1pwYm1Wa2ZWeHVJQ0FnSUNBcUwxeHVJQ0FnSUdaMWJtTjBhVzl1SUhOdGIyOTBhRk5qY205c2JDaGxiQ3dnZUN3Z2VTa2dlMXh1SUNBZ0lDQWdkbUZ5SUhOamNtOXNiR0ZpYkdVN1hHNGdJQ0FnSUNCMllYSWdjM1JoY25SWU8xeHVJQ0FnSUNBZ2RtRnlJSE4wWVhKMFdUdGNiaUFnSUNBZ0lIWmhjaUJ0WlhSb2IyUTdYRzRnSUNBZ0lDQjJZWElnYzNSaGNuUlVhVzFsSUQwZ2JtOTNLQ2s3WEc1Y2JpQWdJQ0FnSUM4dklHUmxabWx1WlNCelkzSnZiR3dnWTI5dWRHVjRkRnh1SUNBZ0lDQWdhV1lnS0dWc0lEMDlQU0JrTG1KdlpIa3BJSHRjYmlBZ0lDQWdJQ0FnYzJOeWIyeHNZV0pzWlNBOUlIYzdYRzRnSUNBZ0lDQWdJSE4wWVhKMFdDQTlJSGN1YzJOeWIyeHNXQ0I4ZkNCM0xuQmhaMlZZVDJabWMyVjBPMXh1SUNBZ0lDQWdJQ0J6ZEdGeWRGa2dQU0IzTG5OamNtOXNiRmtnZkh3Z2R5NXdZV2RsV1U5bVpuTmxkRHRjYmlBZ0lDQWdJQ0FnYldWMGFHOWtJRDBnYjNKcFoybHVZV3d1YzJOeWIyeHNPMXh1SUNBZ0lDQWdmU0JsYkhObElIdGNiaUFnSUNBZ0lDQWdjMk55YjJ4c1lXSnNaU0E5SUdWc08xeHVJQ0FnSUNBZ0lDQnpkR0Z5ZEZnZ1BTQmxiQzV6WTNKdmJHeE1aV1owTzF4dUlDQWdJQ0FnSUNCemRHRnlkRmtnUFNCbGJDNXpZM0p2Ykd4VWIzQTdYRzRnSUNBZ0lDQWdJRzFsZEdodlpDQTlJSE5qY205c2JFVnNaVzFsYm5RN1hHNGdJQ0FnSUNCOVhHNWNiaUFnSUNBZ0lDOHZJSE5qY205c2JDQnNiMjl3YVc1bklHOTJaWElnWVNCbWNtRnRaVnh1SUNBZ0lDQWdjM1JsY0NoN1hHNGdJQ0FnSUNBZ0lITmpjbTlzYkdGaWJHVTZJSE5qY205c2JHRmliR1VzWEc0Z0lDQWdJQ0FnSUcxbGRHaHZaRG9nYldWMGFHOWtMRnh1SUNBZ0lDQWdJQ0J6ZEdGeWRGUnBiV1U2SUhOMFlYSjBWR2x0WlN4Y2JpQWdJQ0FnSUNBZ2MzUmhjblJZT2lCemRHRnlkRmdzWEc0Z0lDQWdJQ0FnSUhOMFlYSjBXVG9nYzNSaGNuUlpMRnh1SUNBZ0lDQWdJQ0I0T2lCNExGeHVJQ0FnSUNBZ0lDQjVPaUI1WEc0Z0lDQWdJQ0I5S1R0Y2JpQWdJQ0I5WEc1Y2JpQWdJQ0F2THlCUFVrbEhTVTVCVENCTlJWUklUMFJUSUU5V1JWSlNTVVJGVTF4dUlDQWdJQzh2SUhjdWMyTnliMnhzSUdGdVpDQjNMbk5qY205c2JGUnZYRzRnSUNBZ2R5NXpZM0p2Ykd3Z1BTQjNMbk5qY205c2JGUnZJRDBnWm5WdVkzUnBiMjRvS1NCN1hHNGdJQ0FnSUNBdkx5QmhkbTlwWkNCaFkzUnBiMjRnZDJobGJpQnVieUJoY21kMWJXVnVkSE1nWVhKbElIQmhjM05sWkZ4dUlDQWdJQ0FnYVdZZ0tHRnlaM1Z0Wlc1MGMxc3dYU0E5UFQwZ2RXNWtaV1pwYm1Wa0tTQjdYRzRnSUNBZ0lDQWdJSEpsZEhWeWJqdGNiaUFnSUNBZ0lIMWNibHh1SUNBZ0lDQWdMeThnWVhadmFXUWdjMjF2YjNSb0lHSmxhR0YyYVc5eUlHbG1JRzV2ZENCeVpYRjFhWEpsWkZ4dUlDQWdJQ0FnYVdZZ0tITm9iM1ZzWkVKaGFXeFBkWFFvWVhKbmRXMWxiblJ6V3pCZEtTQTlQVDBnZEhKMVpTa2dlMXh1SUNBZ0lDQWdJQ0J2Y21sbmFXNWhiQzV6WTNKdmJHd3VZMkZzYkNoY2JpQWdJQ0FnSUNBZ0lDQjNMRnh1SUNBZ0lDQWdJQ0FnSUdGeVozVnRaVzUwYzFzd1hTNXNaV1owSUNFOVBTQjFibVJsWm1sdVpXUmNiaUFnSUNBZ0lDQWdJQ0FnSUQ4Z1lYSm5kVzFsYm5Seld6QmRMbXhsWm5SY2JpQWdJQ0FnSUNBZ0lDQWdJRG9nZEhsd1pXOW1JR0Z5WjNWdFpXNTBjMXN3WFNBaFBUMGdKMjlpYW1WamRDZGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ1B5QmhjbWQxYldWdWRITmJNRjFjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdPaUIzTG5OamNtOXNiRmdnZkh3Z2R5NXdZV2RsV0U5bVpuTmxkQ3hjYmlBZ0lDQWdJQ0FnSUNBdkx5QjFjMlVnZEc5d0lIQnliM0FzSUhObFkyOXVaQ0JoY21kMWJXVnVkQ0JwWmlCd2NtVnpaVzUwSUc5eUlHWmhiR3hpWVdOcklIUnZJSE5qY205c2JGbGNiaUFnSUNBZ0lDQWdJQ0JoY21kMWJXVnVkSE5iTUYwdWRHOXdJQ0U5UFNCMWJtUmxabWx1WldSY2JpQWdJQ0FnSUNBZ0lDQWdJRDhnWVhKbmRXMWxiblJ6V3pCZExuUnZjRnh1SUNBZ0lDQWdJQ0FnSUNBZ09pQmhjbWQxYldWdWRITmJNVjBnSVQwOUlIVnVaR1ZtYVc1bFpGeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBL0lHRnlaM1Z0Wlc1MGMxc3hYVnh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQTZJSGN1YzJOeWIyeHNXU0I4ZkNCM0xuQmhaMlZaVDJabWMyVjBYRzRnSUNBZ0lDQWdJQ2s3WEc1Y2JpQWdJQ0FnSUNBZ2NtVjBkWEp1TzF4dUlDQWdJQ0FnZlZ4dVhHNGdJQ0FnSUNBdkx5Qk1SVlFnVkVoRklGTk5UMDlVU0U1RlUxTWdRa1ZIU1U0aFhHNGdJQ0FnSUNCemJXOXZkR2hUWTNKdmJHd3VZMkZzYkNoY2JpQWdJQ0FnSUNBZ2R5eGNiaUFnSUNBZ0lDQWdaQzVpYjJSNUxGeHVJQ0FnSUNBZ0lDQmhjbWQxYldWdWRITmJNRjB1YkdWbWRDQWhQVDBnZFc1a1pXWnBibVZrWEc0Z0lDQWdJQ0FnSUNBZ1B5QitmbUZ5WjNWdFpXNTBjMXN3WFM1c1pXWjBYRzRnSUNBZ0lDQWdJQ0FnT2lCM0xuTmpjbTlzYkZnZ2ZId2dkeTV3WVdkbFdFOW1abk5sZEN4Y2JpQWdJQ0FnSUNBZ1lYSm5kVzFsYm5Seld6QmRMblJ2Y0NBaFBUMGdkVzVrWldacGJtVmtYRzRnSUNBZ0lDQWdJQ0FnUHlCK2ZtRnlaM1Z0Wlc1MGMxc3dYUzUwYjNCY2JpQWdJQ0FnSUNBZ0lDQTZJSGN1YzJOeWIyeHNXU0I4ZkNCM0xuQmhaMlZaVDJabWMyVjBYRzRnSUNBZ0lDQXBPMXh1SUNBZ0lIMDdYRzVjYmlBZ0lDQXZMeUIzTG5OamNtOXNiRUo1WEc0Z0lDQWdkeTV6WTNKdmJHeENlU0E5SUdaMWJtTjBhVzl1S0NrZ2UxeHVJQ0FnSUNBZ0x5OGdZWFp2YVdRZ1lXTjBhVzl1SUhkb1pXNGdibThnWVhKbmRXMWxiblJ6SUdGeVpTQndZWE56WldSY2JpQWdJQ0FnSUdsbUlDaGhjbWQxYldWdWRITmJNRjBnUFQwOUlIVnVaR1ZtYVc1bFpDa2dlMXh1SUNBZ0lDQWdJQ0J5WlhSMWNtNDdYRzRnSUNBZ0lDQjlYRzVjYmlBZ0lDQWdJQzh2SUdGMmIybGtJSE50YjI5MGFDQmlaV2hoZG1sdmNpQnBaaUJ1YjNRZ2NtVnhkV2x5WldSY2JpQWdJQ0FnSUdsbUlDaHphRzkxYkdSQ1lXbHNUM1YwS0dGeVozVnRaVzUwYzFzd1hTa3BJSHRjYmlBZ0lDQWdJQ0FnYjNKcFoybHVZV3d1YzJOeWIyeHNRbmt1WTJGc2JDaGNiaUFnSUNBZ0lDQWdJQ0IzTEZ4dUlDQWdJQ0FnSUNBZ0lHRnlaM1Z0Wlc1MGMxc3dYUzVzWldaMElDRTlQU0IxYm1SbFptbHVaV1JjYmlBZ0lDQWdJQ0FnSUNBZ0lEOGdZWEpuZFcxbGJuUnpXekJkTG14bFpuUmNiaUFnSUNBZ0lDQWdJQ0FnSURvZ2RIbHdaVzltSUdGeVozVnRaVzUwYzFzd1hTQWhQVDBnSjI5aWFtVmpkQ2NnUHlCaGNtZDFiV1Z1ZEhOYk1GMGdPaUF3TEZ4dUlDQWdJQ0FnSUNBZ0lHRnlaM1Z0Wlc1MGMxc3dYUzUwYjNBZ0lUMDlJSFZ1WkdWbWFXNWxaRnh1SUNBZ0lDQWdJQ0FnSUNBZ1B5QmhjbWQxYldWdWRITmJNRjB1ZEc5d1hHNGdJQ0FnSUNBZ0lDQWdJQ0E2SUdGeVozVnRaVzUwYzFzeFhTQWhQVDBnZFc1a1pXWnBibVZrSUQ4Z1lYSm5kVzFsYm5Seld6RmRJRG9nTUZ4dUlDQWdJQ0FnSUNBcE8xeHVYRzRnSUNBZ0lDQWdJSEpsZEhWeWJqdGNiaUFnSUNBZ0lIMWNibHh1SUNBZ0lDQWdMeThnVEVWVUlGUklSU0JUVFU5UFZFaE9SVk5USUVKRlIwbE9JVnh1SUNBZ0lDQWdjMjF2YjNSb1UyTnliMnhzTG1OaGJHd29YRzRnSUNBZ0lDQWdJSGNzWEc0Z0lDQWdJQ0FnSUdRdVltOWtlU3hjYmlBZ0lDQWdJQ0FnZm41aGNtZDFiV1Z1ZEhOYk1GMHViR1ZtZENBcklDaDNMbk5qY205c2JGZ2dmSHdnZHk1d1lXZGxXRTltWm5ObGRDa3NYRzRnSUNBZ0lDQWdJSDUrWVhKbmRXMWxiblJ6V3pCZExuUnZjQ0FySUNoM0xuTmpjbTlzYkZrZ2ZId2dkeTV3WVdkbFdVOW1abk5sZENsY2JpQWdJQ0FnSUNrN1hHNGdJQ0FnZlR0Y2JseHVJQ0FnSUM4dklFVnNaVzFsYm5RdWNISnZkRzkwZVhCbExuTmpjbTlzYkNCaGJtUWdSV3hsYldWdWRDNXdjbTkwYjNSNWNHVXVjMk55YjJ4c1ZHOWNiaUFnSUNCRmJHVnRaVzUwTG5CeWIzUnZkSGx3WlM1elkzSnZiR3dnUFNCRmJHVnRaVzUwTG5CeWIzUnZkSGx3WlM1elkzSnZiR3hVYnlBOUlHWjFibU4wYVc5dUtDa2dlMXh1SUNBZ0lDQWdMeThnWVhadmFXUWdZV04wYVc5dUlIZG9aVzRnYm04Z1lYSm5kVzFsYm5SeklHRnlaU0J3WVhOelpXUmNiaUFnSUNBZ0lHbG1JQ2hoY21kMWJXVnVkSE5iTUYwZ1BUMDlJSFZ1WkdWbWFXNWxaQ2tnZTF4dUlDQWdJQ0FnSUNCeVpYUjFjbTQ3WEc0Z0lDQWdJQ0I5WEc1Y2JpQWdJQ0FnSUM4dklHRjJiMmxrSUhOdGIyOTBhQ0JpWldoaGRtbHZjaUJwWmlCdWIzUWdjbVZ4ZFdseVpXUmNiaUFnSUNBZ0lHbG1JQ2h6YUc5MWJHUkNZV2xzVDNWMEtHRnlaM1Z0Wlc1MGMxc3dYU2tnUFQwOUlIUnlkV1VwSUh0Y2JpQWdJQ0FnSUNBZ0x5OGdhV1lnYjI1bElHNTFiV0psY2lCcGN5QndZWE56WldRc0lIUm9jbTkzSUdWeWNtOXlJSFJ2SUcxaGRHTm9JRVpwY21WbWIzZ2dhVzF3YkdWdFpXNTBZWFJwYjI1Y2JpQWdJQ0FnSUNBZ2FXWWdLSFI1Y0dWdlppQmhjbWQxYldWdWRITmJNRjBnUFQwOUlDZHVkVzFpWlhJbklDWW1JR0Z5WjNWdFpXNTBjMXN4WFNBOVBUMGdkVzVrWldacGJtVmtLU0I3WEc0Z0lDQWdJQ0FnSUNBZ2RHaHliM2NnYm1WM0lGTjViblJoZUVWeWNtOXlLQ2RXWVd4MVpTQmpiM1ZzWkNCdWIzUWdZbVVnWTI5dWRtVnlkR1ZrSnlrN1hHNGdJQ0FnSUNBZ0lIMWNibHh1SUNBZ0lDQWdJQ0J2Y21sbmFXNWhiQzVsYkdWdFpXNTBVMk55YjJ4c0xtTmhiR3dvWEc0Z0lDQWdJQ0FnSUNBZ2RHaHBjeXhjYmlBZ0lDQWdJQ0FnSUNBdkx5QjFjMlVnYkdWbWRDQndjbTl3TENCbWFYSnpkQ0J1ZFcxaVpYSWdZWEpuZFcxbGJuUWdiM0lnWm1Gc2JHSmhZMnNnZEc4Z2MyTnliMnhzVEdWbWRGeHVJQ0FnSUNBZ0lDQWdJR0Z5WjNWdFpXNTBjMXN3WFM1c1pXWjBJQ0U5UFNCMWJtUmxabWx1WldSY2JpQWdJQ0FnSUNBZ0lDQWdJRDhnZm41aGNtZDFiV1Z1ZEhOYk1GMHViR1ZtZEZ4dUlDQWdJQ0FnSUNBZ0lDQWdPaUIwZVhCbGIyWWdZWEpuZFcxbGJuUnpXekJkSUNFOVBTQW5iMkpxWldOMEp5QS9JSDUrWVhKbmRXMWxiblJ6V3pCZElEb2dkR2hwY3k1elkzSnZiR3hNWldaMExGeHVJQ0FnSUNBZ0lDQWdJQzh2SUhWelpTQjBiM0FnY0hKdmNDd2djMlZqYjI1a0lHRnlaM1Z0Wlc1MElHOXlJR1poYkd4aVlXTnJJSFJ2SUhOamNtOXNiRlJ2Y0Z4dUlDQWdJQ0FnSUNBZ0lHRnlaM1Z0Wlc1MGMxc3dYUzUwYjNBZ0lUMDlJSFZ1WkdWbWFXNWxaRnh1SUNBZ0lDQWdJQ0FnSUNBZ1B5QitmbUZ5WjNWdFpXNTBjMXN3WFM1MGIzQmNiaUFnSUNBZ0lDQWdJQ0FnSURvZ1lYSm5kVzFsYm5Seld6RmRJQ0U5UFNCMWJtUmxabWx1WldRZ1B5QitmbUZ5WjNWdFpXNTBjMXN4WFNBNklIUm9hWE11YzJOeWIyeHNWRzl3WEc0Z0lDQWdJQ0FnSUNrN1hHNWNiaUFnSUNBZ0lDQWdjbVYwZFhKdU8xeHVJQ0FnSUNBZ2ZWeHVYRzRnSUNBZ0lDQjJZWElnYkdWbWRDQTlJR0Z5WjNWdFpXNTBjMXN3WFM1c1pXWjBPMXh1SUNBZ0lDQWdkbUZ5SUhSdmNDQTlJR0Z5WjNWdFpXNTBjMXN3WFM1MGIzQTdYRzVjYmlBZ0lDQWdJQzh2SUV4RlZDQlVTRVVnVTAxUFQxUklUa1ZUVXlCQ1JVZEpUaUZjYmlBZ0lDQWdJSE50YjI5MGFGTmpjbTlzYkM1allXeHNLRnh1SUNBZ0lDQWdJQ0IwYUdsekxGeHVJQ0FnSUNBZ0lDQjBhR2x6TEZ4dUlDQWdJQ0FnSUNCMGVYQmxiMllnYkdWbWRDQTlQVDBnSjNWdVpHVm1hVzVsWkNjZ1B5QjBhR2x6TG5OamNtOXNiRXhsWm5RZ09pQitmbXhsWm5Rc1hHNGdJQ0FnSUNBZ0lIUjVjR1Z2WmlCMGIzQWdQVDA5SUNkMWJtUmxabWx1WldRbklEOGdkR2hwY3k1elkzSnZiR3hVYjNBZ09pQitmblJ2Y0Z4dUlDQWdJQ0FnS1R0Y2JpQWdJQ0I5TzF4dVhHNGdJQ0FnTHk4Z1JXeGxiV1Z1ZEM1d2NtOTBiM1I1Y0dVdWMyTnliMnhzUW5sY2JpQWdJQ0JGYkdWdFpXNTBMbkJ5YjNSdmRIbHdaUzV6WTNKdmJHeENlU0E5SUdaMWJtTjBhVzl1S0NrZ2UxeHVJQ0FnSUNBZ0x5OGdZWFp2YVdRZ1lXTjBhVzl1SUhkb1pXNGdibThnWVhKbmRXMWxiblJ6SUdGeVpTQndZWE56WldSY2JpQWdJQ0FnSUdsbUlDaGhjbWQxYldWdWRITmJNRjBnUFQwOUlIVnVaR1ZtYVc1bFpDa2dlMXh1SUNBZ0lDQWdJQ0J5WlhSMWNtNDdYRzRnSUNBZ0lDQjlYRzVjYmlBZ0lDQWdJQzh2SUdGMmIybGtJSE50YjI5MGFDQmlaV2hoZG1sdmNpQnBaaUJ1YjNRZ2NtVnhkV2x5WldSY2JpQWdJQ0FnSUdsbUlDaHphRzkxYkdSQ1lXbHNUM1YwS0dGeVozVnRaVzUwYzFzd1hTa2dQVDA5SUhSeWRXVXBJSHRjYmlBZ0lDQWdJQ0FnYjNKcFoybHVZV3d1Wld4bGJXVnVkRk5qY205c2JDNWpZV3hzS0Z4dUlDQWdJQ0FnSUNBZ0lIUm9hWE1zWEc0Z0lDQWdJQ0FnSUNBZ1lYSm5kVzFsYm5Seld6QmRMbXhsWm5RZ0lUMDlJSFZ1WkdWbWFXNWxaRnh1SUNBZ0lDQWdJQ0FnSUNBZ1B5QitmbUZ5WjNWdFpXNTBjMXN3WFM1c1pXWjBJQ3NnZEdocGN5NXpZM0p2Ykd4TVpXWjBYRzRnSUNBZ0lDQWdJQ0FnSUNBNklINStZWEpuZFcxbGJuUnpXekJkSUNzZ2RHaHBjeTV6WTNKdmJHeE1aV1owTEZ4dUlDQWdJQ0FnSUNBZ0lHRnlaM1Z0Wlc1MGMxc3dYUzUwYjNBZ0lUMDlJSFZ1WkdWbWFXNWxaRnh1SUNBZ0lDQWdJQ0FnSUNBZ1B5QitmbUZ5WjNWdFpXNTBjMXN3WFM1MGIzQWdLeUIwYUdsekxuTmpjbTlzYkZSdmNGeHVJQ0FnSUNBZ0lDQWdJQ0FnT2lCK2ZtRnlaM1Z0Wlc1MGMxc3hYU0FySUhSb2FYTXVjMk55YjJ4c1ZHOXdYRzRnSUNBZ0lDQWdJQ2s3WEc1Y2JpQWdJQ0FnSUNBZ2NtVjBkWEp1TzF4dUlDQWdJQ0FnZlZ4dVhHNGdJQ0FnSUNCMGFHbHpMbk5qY205c2JDaDdYRzRnSUNBZ0lDQWdJR3hsWm5RNklINStZWEpuZFcxbGJuUnpXekJkTG14bFpuUWdLeUIwYUdsekxuTmpjbTlzYkV4bFpuUXNYRzRnSUNBZ0lDQWdJSFJ2Y0RvZ2ZuNWhjbWQxYldWdWRITmJNRjB1ZEc5d0lDc2dkR2hwY3k1elkzSnZiR3hVYjNBc1hHNGdJQ0FnSUNBZ0lHSmxhR0YyYVc5eU9pQmhjbWQxYldWdWRITmJNRjB1WW1Wb1lYWnBiM0pjYmlBZ0lDQWdJSDBwTzF4dUlDQWdJSDA3WEc1Y2JpQWdJQ0F2THlCRmJHVnRaVzUwTG5CeWIzUnZkSGx3WlM1elkzSnZiR3hKYm5SdlZtbGxkMXh1SUNBZ0lFVnNaVzFsYm5RdWNISnZkRzkwZVhCbExuTmpjbTlzYkVsdWRHOVdhV1YzSUQwZ1puVnVZM1JwYjI0b0tTQjdYRzRnSUNBZ0lDQXZMeUJoZG05cFpDQnpiVzl2ZEdnZ1ltVm9ZWFpwYjNJZ2FXWWdibTkwSUhKbGNYVnBjbVZrWEc0Z0lDQWdJQ0JwWmlBb2MyaHZkV3hrUW1GcGJFOTFkQ2hoY21kMWJXVnVkSE5iTUYwcElEMDlQU0IwY25WbEtTQjdYRzRnSUNBZ0lDQWdJRzl5YVdkcGJtRnNMbk5qY205c2JFbHVkRzlXYVdWM0xtTmhiR3dvWEc0Z0lDQWdJQ0FnSUNBZ2RHaHBjeXhjYmlBZ0lDQWdJQ0FnSUNCaGNtZDFiV1Z1ZEhOYk1GMGdQVDA5SUhWdVpHVm1hVzVsWkNBL0lIUnlkV1VnT2lCaGNtZDFiV1Z1ZEhOYk1GMWNiaUFnSUNBZ0lDQWdLVHRjYmx4dUlDQWdJQ0FnSUNCeVpYUjFjbTQ3WEc0Z0lDQWdJQ0I5WEc1Y2JpQWdJQ0FnSUM4dklFeEZWQ0JVU0VVZ1UwMVBUMVJJVGtWVFV5QkNSVWRKVGlGY2JpQWdJQ0FnSUhaaGNpQnpZM0p2Ykd4aFlteGxVR0Z5Wlc1MElEMGdabWx1WkZOamNtOXNiR0ZpYkdWUVlYSmxiblFvZEdocGN5azdYRzRnSUNBZ0lDQjJZWElnY0dGeVpXNTBVbVZqZEhNZ1BTQnpZM0p2Ykd4aFlteGxVR0Z5Wlc1MExtZGxkRUp2ZFc1a2FXNW5RMnhwWlc1MFVtVmpkQ2dwTzF4dUlDQWdJQ0FnZG1GeUlHTnNhV1Z1ZEZKbFkzUnpJRDBnZEdocGN5NW5aWFJDYjNWdVpHbHVaME5zYVdWdWRGSmxZM1FvS1R0Y2JseHVJQ0FnSUNBZ2FXWWdLSE5qY205c2JHRmliR1ZRWVhKbGJuUWdJVDA5SUdRdVltOWtlU2tnZTF4dUlDQWdJQ0FnSUNBdkx5QnlaWFpsWVd3Z1pXeGxiV1Z1ZENCcGJuTnBaR1VnY0dGeVpXNTBYRzRnSUNBZ0lDQWdJSE50YjI5MGFGTmpjbTlzYkM1allXeHNLRnh1SUNBZ0lDQWdJQ0FnSUhSb2FYTXNYRzRnSUNBZ0lDQWdJQ0FnYzJOeWIyeHNZV0pzWlZCaGNtVnVkQ3hjYmlBZ0lDQWdJQ0FnSUNCelkzSnZiR3hoWW14bFVHRnlaVzUwTG5OamNtOXNiRXhsWm5RZ0t5QmpiR2xsYm5SU1pXTjBjeTVzWldaMElDMGdjR0Z5Wlc1MFVtVmpkSE11YkdWbWRDeGNiaUFnSUNBZ0lDQWdJQ0J6WTNKdmJHeGhZbXhsVUdGeVpXNTBMbk5qY205c2JGUnZjQ0FySUdOc2FXVnVkRkpsWTNSekxuUnZjQ0F0SUhCaGNtVnVkRkpsWTNSekxuUnZjRnh1SUNBZ0lDQWdJQ0FwTzF4dVhHNGdJQ0FnSUNBZ0lDOHZJSEpsZG1WaGJDQndZWEpsYm5RZ2FXNGdkbWxsZDNCdmNuUWdkVzVzWlhOeklHbHpJR1pwZUdWa1hHNGdJQ0FnSUNBZ0lHbG1JQ2gzTG1kbGRFTnZiWEIxZEdWa1UzUjViR1VvYzJOeWIyeHNZV0pzWlZCaGNtVnVkQ2t1Y0c5emFYUnBiMjRnSVQwOUlDZG1hWGhsWkNjcElIdGNiaUFnSUNBZ0lDQWdJQ0IzTG5OamNtOXNiRUo1S0h0Y2JpQWdJQ0FnSUNBZ0lDQWdJR3hsWm5RNklIQmhjbVZ1ZEZKbFkzUnpMbXhsWm5Rc1hHNGdJQ0FnSUNBZ0lDQWdJQ0IwYjNBNklIQmhjbVZ1ZEZKbFkzUnpMblJ2Y0N4Y2JpQWdJQ0FnSUNBZ0lDQWdJR0psYUdGMmFXOXlPaUFuYzIxdmIzUm9KMXh1SUNBZ0lDQWdJQ0FnSUgwcE8xeHVJQ0FnSUNBZ0lDQjlYRzRnSUNBZ0lDQjlJR1ZzYzJVZ2UxeHVJQ0FnSUNBZ0lDQXZMeUJ5WlhabFlXd2daV3hsYldWdWRDQnBiaUIyYVdWM2NHOXlkRnh1SUNBZ0lDQWdJQ0IzTG5OamNtOXNiRUo1S0h0Y2JpQWdJQ0FnSUNBZ0lDQnNaV1owT2lCamJHbGxiblJTWldOMGN5NXNaV1owTEZ4dUlDQWdJQ0FnSUNBZ0lIUnZjRG9nWTJ4cFpXNTBVbVZqZEhNdWRHOXdMRnh1SUNBZ0lDQWdJQ0FnSUdKbGFHRjJhVzl5T2lBbmMyMXZiM1JvSjF4dUlDQWdJQ0FnSUNCOUtUdGNiaUFnSUNBZ0lIMWNiaUFnSUNCOU8xeHVJQ0I5WEc1Y2JpQWdhV1lnS0hSNWNHVnZaaUJsZUhCdmNuUnpJRDA5UFNBbmIySnFaV04wSnlBbUppQjBlWEJsYjJZZ2JXOWtkV3hsSUNFOVBTQW5kVzVrWldacGJtVmtKeWtnZTF4dUlDQWdJQzh2SUdOdmJXMXZibXB6WEc0Z0lDQWdiVzlrZFd4bExtVjRjRzl5ZEhNZ1BTQjdJSEJ2YkhsbWFXeHNPaUJ3YjJ4NVptbHNiQ0I5TzF4dUlDQjlJR1ZzYzJVZ2UxeHVJQ0FnSUM4dklHZHNiMkpoYkZ4dUlDQWdJSEJ2YkhsbWFXeHNLQ2s3WEc0Z0lIMWNibHh1ZlNncEtUdGNiaUlzSW1OdmJuTjBJRVJDSUQwZ0oyaDBkSEJ6T2k4dmJtVjRkWE10WTJGMFlXeHZaeTVtYVhKbFltRnpaV2x2TG1OdmJTOXdiM04wY3k1cWMyOXVQMkYxZEdnOU4yYzNjSGxMUzNsclRqTk9OV1YzY2tsdGFFOWhVeloyZDNKR2MyTTFaa3RyY21zNFpXcDZaaWM3WEc1amIyNXpkQ0JoYkhCb1lXSmxkQ0E5SUZzbllTY3NJQ2RpSnl3Z0oyTW5MQ0FuWkNjc0lDZGxKeXdnSjJZbkxDQW5aeWNzSUNkb0p5d2dKMmtuTENBbmFpY3NJQ2RySnl3Z0oyd25MQ0FuYlNjc0lDZHVKeXdnSjI4bkxDQW5jQ2NzSUNkeUp5d2dKM01uTENBbmRDY3NJQ2QxSnl3Z0ozWW5MQ0FuZHljc0lDZDVKeXdnSjNvblhUdGNibHh1WTI5dWMzUWdKR3h2WVdScGJtY2dQU0JCY25KaGVTNW1jbTl0S0dSdlkzVnRaVzUwTG5GMVpYSjVVMlZzWldOMGIzSkJiR3dvSnk1c2IyRmthVzVuSnlrcE8xeHVZMjl1YzNRZ0pHNWhkaUE5SUdSdlkzVnRaVzUwTG1kbGRFVnNaVzFsYm5SQ2VVbGtLQ2RxY3kxdVlYWW5LVHRjYm1OdmJuTjBJQ1J3WVhKaGJHeGhlQ0E5SUdSdlkzVnRaVzUwTG5GMVpYSjVVMlZzWldOMGIzSW9KeTV3WVhKaGJHeGhlQ2NwTzF4dVkyOXVjM1FnSkdOdmJuUmxiblFnUFNCa2IyTjFiV1Z1ZEM1eGRXVnllVk5sYkdWamRHOXlLQ2N1WTI5dWRHVnVkQ2NwTzF4dVkyOXVjM1FnSkhScGRHeGxJRDBnWkc5amRXMWxiblF1WjJWMFJXeGxiV1Z1ZEVKNVNXUW9KMnB6TFhScGRHeGxKeWs3WEc1amIyNXpkQ0FrWVhKeWIzY2dQU0JrYjJOMWJXVnVkQzV4ZFdWeWVWTmxiR1ZqZEc5eUtDY3VZWEp5YjNjbktUdGNibU52Ym5OMElDUnRiMlJoYkNBOUlHUnZZM1Z0Wlc1MExuRjFaWEo1VTJWc1pXTjBiM0lvSnk1dGIyUmhiQ2NwTzF4dVkyOXVjM1FnSkd4cFoyaDBZbTk0SUQwZ1pHOWpkVzFsYm5RdWNYVmxjbmxUWld4bFkzUnZjaWduTG14cFoyaDBZbTk0SnlrN1hHNWpiMjV6ZENBa2RtbGxkeUE5SUdSdlkzVnRaVzUwTG5GMVpYSjVVMlZzWldOMGIzSW9KeTVzYVdkb2RHSnZlQzEyYVdWM0p5azdYRzVjYm1WNGNHOXlkQ0I3SUZ4dVhIUkVRaXdnWEc1Y2RHRnNjR2hoWW1WMExDQmNibHgwSkd4dllXUnBibWNzSUZ4dVhIUWtibUYyTENCY2JseDBKSEJoY21Gc2JHRjRMRnh1WEhRa1kyOXVkR1Z1ZEN4Y2JseDBKSFJwZEd4bExGeHVYSFFrWVhKeWIzY3NYRzVjZENSdGIyUmhiQ3hjYmx4MEpHeHBaMmgwWW05NExGeHVYSFFrZG1sbGR5QmNibjA3SWl3aWFXMXdiM0owSUhOdGIyOTBhSE5qY205c2JDQm1jbTl0SUNkemJXOXZkR2h6WTNKdmJHd3RjRzlzZVdacGJHd25PMXh1WEc1cGJYQnZjblFnZXlCaGNuUnBZMnhsVkdWdGNHeGhkR1VzSUc1aGRreG5JSDBnWm5KdmJTQW5MaTkwWlcxd2JHRjBaWE1uTzF4dWFXMXdiM0owSUhzZ1pHVmliM1Z1WTJVc0lHaHBaR1ZNYjJGa2FXNW5JSDBnWm5KdmJTQW5MaTkxZEdsc2N5YzdYRzVwYlhCdmNuUWdleUJFUWl3Z1lXeHdhR0ZpWlhRc0lDUnVZWFlzSUNSd1lYSmhiR3hoZUN3Z0pHTnZiblJsYm5Rc0lDUjBhWFJzWlN3Z0pHRnljbTkzTENBa2JXOWtZV3dzSUNSc2FXZG9kR0p2ZUN3Z0pIWnBaWGNnZlNCbWNtOXRJQ2N1TDJOdmJuTjBZVzUwY3ljN1hHNWNibXhsZENCemIzSjBTMlY1SUQwZ01Ec2dMeThnTUNBOUlHRnlkR2x6ZEN3Z01TQTlJSFJwZEd4bFhHNXNaWFFnWlc1MGNtbGxjeUE5SUhzZ1lubEJkWFJvYjNJNklGdGRMQ0JpZVZScGRHeGxPaUJiWFNCOU8xeHViR1YwSUdOMWNuSmxiblJNWlhSMFpYSWdQU0FuUVNjN1hHNXNaWFFnYlc5a1lXd2dQU0JtWVd4elpUdGNibXhsZENCc2FXZG9kR0p2ZUNBOUlHWmhiSE5sTzF4dVhHNWpiMjV6ZENCaGRIUmhZMmhKYldGblpVeHBjM1JsYm1WeWN5QTlJQ2dwSUQwK0lIdGNibHgwWTI5dWMzUWdKR2x0WVdkbGN5QTlJRUZ5Y21GNUxtWnliMjBvWkc5amRXMWxiblF1Y1hWbGNubFRaV3hsWTNSdmNrRnNiQ2duTG1GeWRHbGpiR1V0YVcxaFoyVW5LU2s3WEc1Y2JseDBKR2x0WVdkbGN5NW1iM0pGWVdOb0tHbHRaeUE5UGlCN1hHNWNkRngwYVcxbkxtRmtaRVYyWlc1MFRHbHpkR1Z1WlhJb0oyTnNhV05ySnl3Z0tHVjJkQ2tnUFQ0Z2UxeHVYSFJjZEZ4MGFXWWdLQ0ZzYVdkb2RHSnZlQ2tnZTF4dVhIUmNkRngwWEhSc1pYUWdjM0pqSUQwZ2FXMW5Mbk55WXp0Y2JseDBYSFJjZEZ4MFhHNWNkRngwWEhSY2RDUnNhV2RvZEdKdmVDNWpiR0Z6YzB4cGMzUXVZV1JrS0NkemFHOTNMV2x0WnljcE8xeHVYSFJjZEZ4MFhIUWtkbWxsZHk1elpYUkJkSFJ5YVdKMWRHVW9KM04wZVd4bEp5d2dZR0poWTJ0bmNtOTFibVF0YVcxaFoyVTZJSFZ5YkNna2UzTnlZMzBwWUNrN1hHNWNkRngwWEhSY2RHeHBaMmgwWW05NElEMGdkSEoxWlR0Y2JseDBYSFJjZEgxY2JseDBYSFI5S1R0Y2JseDBmU2s3WEc1Y2JseDBKSFpwWlhjdVlXUmtSWFpsYm5STWFYTjBaVzVsY2lnblkyeHBZMnNuTENBb0tTQTlQaUI3WEc1Y2RGeDBhV1lnS0d4cFoyaDBZbTk0S1NCN1hHNWNkRngwWEhRa2JHbG5hSFJpYjNndVkyeGhjM05NYVhOMExuSmxiVzkyWlNnbmMyaHZkeTFwYldjbktUdGNibHgwWEhSY2RHeHBaMmgwWW05NElEMGdabUZzYzJVN1hHNWNkRngwZlZ4dVhIUjlLVHRjYm4wN1hHNWNibU52Ym5OMElHRjBkR0ZqYUUxdlpHRnNUR2x6ZEdWdVpYSnpJRDBnS0NrZ1BUNGdlMXh1WEhSamIyNXpkQ0FrWm1sdVpDQTlJR1J2WTNWdFpXNTBMbWRsZEVWc1pXMWxiblJDZVVsa0tDZHFjeTFtYVc1a0p5azdYRzVjZEZ4dVhIUWtabWx1WkM1aFpHUkZkbVZ1ZEV4cGMzUmxibVZ5S0NkamJHbGpheWNzSUNncElEMCtJSHRjYmx4MFhIUWtiVzlrWVd3dVkyeGhjM05NYVhOMExtRmtaQ2duYzJodmR5Y3BPMXh1WEhSY2RHMXZaR0ZzSUQwZ2RISjFaVHRjYmx4MGZTazdYRzVjYmx4MEpHMXZaR0ZzTG1Ga1pFVjJaVzUwVEdsemRHVnVaWElvSjJOc2FXTnJKeXdnS0NrZ1BUNGdlMXh1WEhSY2RDUnRiMlJoYkM1amJHRnpjMHhwYzNRdWNtVnRiM1psS0NkemFHOTNKeWs3WEc1Y2RGeDBiVzlrWVd3Z1BTQm1ZV3h6WlR0Y2JseDBmU2s3WEc1Y2JseDBkMmx1Wkc5M0xtRmtaRVYyWlc1MFRHbHpkR1Z1WlhJb0oydGxlV1J2ZDI0bkxDQW9LU0E5UGlCN1hHNWNkRngwYVdZZ0tHMXZaR0ZzS1NCN1hHNWNkRngwWEhSelpYUlVhVzFsYjNWMEtDZ3BJRDArSUh0Y2JseDBYSFJjZEZ4MEpHMXZaR0ZzTG1Oc1lYTnpUR2x6ZEM1eVpXMXZkbVVvSjNOb2IzY25LVHRjYmx4MFhIUmNkRngwYlc5a1lXd2dQU0JtWVd4elpUdGNibHgwWEhSY2RIMHNJRFl3TUNrN1hHNWNkRngwZlR0Y2JseDBmU2s3WEc1OVhHNWNibU52Ym5OMElITmpjbTlzYkZSdlZHOXdJRDBnS0NrZ1BUNGdlMXh1WEhSc1pYUWdkR2hwYm1jZ1BTQmtiMk4xYldWdWRDNW5aWFJGYkdWdFpXNTBRbmxKWkNnbllXNWphRzl5TFhSaGNtZGxkQ2NwTzF4dVhIUjBhR2x1Wnk1elkzSnZiR3hKYm5SdlZtbGxkeWg3WW1Wb1lYWnBiM0k2SUZ3aWMyMXZiM1JvWENJc0lHSnNiMk5yT2lCY0luTjBZWEowWENKOUtUdGNibjFjYmx4dWJHVjBJSEJ5WlhZN1hHNXNaWFFnWTNWeWNtVnVkQ0E5SURBN1hHNXNaWFFnYVhOVGFHOTNhVzVuSUQwZ1ptRnNjMlU3WEc1amIyNXpkQ0JoZEhSaFkyaEJjbkp2ZDB4cGMzUmxibVZ5Y3lBOUlDZ3BJRDArSUh0Y2JseDBKR0Z5Y205M0xtRmtaRVYyWlc1MFRHbHpkR1Z1WlhJb0oyTnNhV05ySnl3Z0tDa2dQVDRnZTF4dVhIUmNkSE5qY205c2JGUnZWRzl3S0NrN1hHNWNkSDBwTzF4dVhHNWNkQ1J3WVhKaGJHeGhlQzVoWkdSRmRtVnVkRXhwYzNSbGJtVnlLQ2R6WTNKdmJHd25MQ0FvS1NBOVBpQjdYRzVjYmx4MFhIUnNaWFFnZVNBOUlDUjBhWFJzWlM1blpYUkNiM1Z1WkdsdVowTnNhV1Z1ZEZKbFkzUW9LUzU1TzF4dVhIUmNkR2xtSUNoamRYSnlaVzUwSUNFOVBTQjVLU0I3WEc1Y2RGeDBYSFJ3Y21WMklEMGdZM1Z5Y21WdWREdGNibHgwWEhSY2RHTjFjbkpsYm5RZ1BTQjVPMXh1WEhSY2RIMWNibHh1WEhSY2RHbG1JQ2g1SUR3OUlDMDFNQ0FtSmlBaGFYTlRhRzkzYVc1bktTQjdYRzVjZEZ4MFhIUWtZWEp5YjNjdVkyeGhjM05NYVhOMExtRmtaQ2duYzJodmR5Y3BPMXh1WEhSY2RGeDBhWE5UYUc5M2FXNW5JRDBnZEhKMVpUdGNibHgwWEhSOUlHVnNjMlVnYVdZZ0tIa2dQaUF0TlRBZ0ppWWdhWE5UYUc5M2FXNW5LU0I3WEc1Y2RGeDBYSFFrWVhKeWIzY3VZMnhoYzNOTWFYTjBMbkpsYlc5MlpTZ25jMmh2ZHljcE8xeHVYSFJjZEZ4MGFYTlRhRzkzYVc1bklEMGdabUZzYzJVN1hHNWNkRngwZlZ4dVhIUjlLVHRjYm4wN1hHNWNibU52Ym5OMElHRmtaRk52Y25SQ2RYUjBiMjVNYVhOMFpXNWxjbk1nUFNBb0tTQTlQaUI3WEc1Y2RHeGxkQ0FrWW5sQmNuUnBjM1FnUFNCa2IyTjFiV1Z1ZEM1blpYUkZiR1Z0Wlc1MFFubEpaQ2duYW5NdFlua3RZWEowYVhOMEp5azdYRzVjZEd4bGRDQWtZbmxVYVhSc1pTQTlJR1J2WTNWdFpXNTBMbWRsZEVWc1pXMWxiblJDZVVsa0tDZHFjeTFpZVMxMGFYUnNaU2NwTzF4dVhIUWtZbmxCY25ScGMzUXVZV1JrUlhabGJuUk1hWE4wWlc1bGNpZ25ZMnhwWTJzbkxDQW9LU0E5UGlCN1hHNWNkRngwYVdZZ0tITnZjblJMWlhrcElIdGNibHgwWEhSY2RITmpjbTlzYkZSdlZHOXdLQ2s3WEc1Y2RGeDBYSFJ6YjNKMFMyVjVJRDBnTUR0Y2JseDBYSFJjZENSaWVVRnlkR2x6ZEM1amJHRnpjMHhwYzNRdVlXUmtLQ2RoWTNScGRtVW5LVHRjYmx4MFhIUmNkQ1JpZVZScGRHeGxMbU5zWVhOelRHbHpkQzV5WlcxdmRtVW9KMkZqZEdsMlpTY3BPMXh1WEc1Y2RGeDBYSFJ5Wlc1a1pYSkZiblJ5YVdWektDazdYRzVjZEZ4MGZWeHVYSFI5S1R0Y2JseHVYSFFrWW5sVWFYUnNaUzVoWkdSRmRtVnVkRXhwYzNSbGJtVnlLQ2RqYkdsamF5Y3NJQ2dwSUQwK0lIdGNibHgwWEhScFppQW9JWE52Y25STFpYa3BJSHRjYmx4MFhIUmNkSE5qY205c2JGUnZWRzl3S0NrN1hHNWNkRngwWEhSemIzSjBTMlY1SUQwZ01UdGNibHgwWEhSY2RDUmllVlJwZEd4bExtTnNZWE56VEdsemRDNWhaR1FvSjJGamRHbDJaU2NwTzF4dVhIUmNkRngwSkdKNVFYSjBhWE4wTG1Oc1lYTnpUR2x6ZEM1eVpXMXZkbVVvSjJGamRHbDJaU2NwTzF4dVhHNWNkRngwWEhSeVpXNWtaWEpGYm5SeWFXVnpLQ2s3WEc1Y2RGeDBmVnh1WEhSOUtUdGNibjA3WEc1Y2JtTnZibk4wSUdOc1pXRnlRVzVqYUc5eWN5QTlJQ2h3Y21WMlUyVnNaV04wYjNJcElEMCtJSHRjYmx4MGJHVjBJQ1JsYm5SeWFXVnpJRDBnUVhKeVlYa3Vabkp2YlNoa2IyTjFiV1Z1ZEM1eGRXVnllVk5sYkdWamRHOXlRV3hzS0hCeVpYWlRaV3hsWTNSdmNpa3BPMXh1WEhRa1pXNTBjbWxsY3k1bWIzSkZZV05vS0dWdWRISjVJRDArSUdWdWRISjVMbkpsYlc5MlpVRjBkSEpwWW5WMFpTZ25ibUZ0WlNjcEtUdGNibjA3WEc1Y2JtTnZibk4wSUdacGJtUkdhWEp6ZEVWdWRISjVJRDBnS0dOb1lYSXBJRDArSUh0Y2JseDBiR1YwSUhObGJHVmpkRzl5SUQwZ2MyOXlkRXRsZVNBL0lDY3Vhbk10Wlc1MGNua3RkR2wwYkdVbklEb2dKeTVxY3kxbGJuUnllUzFoY25ScGMzUW5PMXh1WEhSc1pYUWdjSEpsZGxObGJHVmpkRzl5SUQwZ0lYTnZjblJMWlhrZ1B5QW5MbXB6TFdWdWRISjVMWFJwZEd4bEp5QTZJQ2N1YW5NdFpXNTBjbmt0WVhKMGFYTjBKenRjYmx4MGJHVjBJQ1JsYm5SeWFXVnpJRDBnUVhKeVlYa3Vabkp2YlNoa2IyTjFiV1Z1ZEM1eGRXVnllVk5sYkdWamRHOXlRV3hzS0hObGJHVmpkRzl5S1NrN1hHNWNibHgwWTJ4bFlYSkJibU5vYjNKektIQnlaWFpUWld4bFkzUnZjaWs3WEc1Y2JseDBjbVYwZFhKdUlDUmxiblJ5YVdWekxtWnBibVFvWlc1MGNua2dQVDRnZTF4dVhIUmNkR3hsZENCdWIyUmxJRDBnWlc1MGNua3VibVY0ZEVWc1pXMWxiblJUYVdKc2FXNW5PMXh1WEhSY2RISmxkSFZ5YmlCdWIyUmxMbWx1Ym1WeVNGUk5URnN3WFNBOVBUMGdZMmhoY2lCOGZDQnViMlJsTG1sdWJtVnlTRlJOVEZzd1hTQTlQVDBnWTJoaGNpNTBiMVZ3Y0dWeVEyRnpaU2dwTzF4dVhIUjlLVHRjYm4wN1hHNWNibHh1WTI5dWMzUWdiV0ZyWlVGc2NHaGhZbVYwSUQwZ0tDa2dQVDRnZTF4dVhIUmpiMjV6ZENCaGRIUmhZMmhCYm1Ob2IzSk1hWE4wWlc1bGNpQTlJQ2drWVc1amFHOXlMQ0JzWlhSMFpYSXBJRDArSUh0Y2JseDBYSFFrWVc1amFHOXlMbUZrWkVWMlpXNTBUR2x6ZEdWdVpYSW9KMk5zYVdOckp5d2dLQ2tnUFQ0Z2UxeHVYSFJjZEZ4MFkyOXVjM1FnYkdWMGRHVnlUbTlrWlNBOUlHUnZZM1Z0Wlc1MExtZGxkRVZzWlcxbGJuUkNlVWxrS0d4bGRIUmxjaWs3WEc1Y2RGeDBYSFJzWlhRZ2RHRnlaMlYwTzF4dVhHNWNkRngwWEhScFppQW9JWE52Y25STFpYa3BJSHRjYmx4MFhIUmNkRngwZEdGeVoyVjBJRDBnYkdWMGRHVnlJRDA5UFNBbllTY2dQeUJrYjJOMWJXVnVkQzVuWlhSRmJHVnRaVzUwUW5sSlpDZ25ZVzVqYUc5eUxYUmhjbWRsZENjcElEb2diR1YwZEdWeVRtOWtaUzV3WVhKbGJuUkZiR1Z0Wlc1MExuQmhjbVZ1ZEVWc1pXMWxiblF1Y0dGeVpXNTBSV3hsYldWdWRDNXdZWEpsYm5SRmJHVnRaVzUwTG5CeVpYWnBiM1Z6Uld4bGJXVnVkRk5wWW14cGJtY3VjWFZsY25sVFpXeGxZM1J2Y2lnbkxtcHpMV0Z5ZEdsamJHVXRZVzVqYUc5eUxYUmhjbWRsZENjcE8xeHVYSFJjZEZ4MGZTQmxiSE5sSUh0Y2JseDBYSFJjZEZ4MGRHRnlaMlYwSUQwZ2JHVjBkR1Z5SUQwOVBTQW5ZU2NnUHlCa2IyTjFiV1Z1ZEM1blpYUkZiR1Z0Wlc1MFFubEpaQ2duWVc1amFHOXlMWFJoY21kbGRDY3BJRG9nYkdWMGRHVnlUbTlrWlM1d1lYSmxiblJGYkdWdFpXNTBMbkJoY21WdWRFVnNaVzFsYm5RdWNHRnlaVzUwUld4bGJXVnVkQzV3Y21WMmFXOTFjMFZzWlcxbGJuUlRhV0pzYVc1bkxuRjFaWEo1VTJWc1pXTjBiM0lvSnk1cWN5MWhjblJwWTJ4bExXRnVZMmh2Y2kxMFlYSm5aWFFuS1R0Y2JseDBYSFJjZEgwN1hHNWNibHgwWEhSY2RIUmhjbWRsZEM1elkzSnZiR3hKYm5SdlZtbGxkeWg3WW1Wb1lYWnBiM0k2SUZ3aWMyMXZiM1JvWENJc0lHSnNiMk5yT2lCY0luTjBZWEowWENKOUtUdGNibHgwWEhSOUtUdGNibHgwZlR0Y2JseHVYSFJzWlhRZ1lXTjBhWFpsUlc1MGNtbGxjeUE5SUh0OU8xeHVYSFJzWlhRZ0pHOTFkR1Z5SUQwZ1pHOWpkVzFsYm5RdWNYVmxjbmxUWld4bFkzUnZjaWduTG1Gc2NHaGhZbVYwWDE5c1pYUjBaWEp6SnlrN1hHNWNkQ1J2ZFhSbGNpNXBibTVsY2toVVRVd2dQU0FuSnp0Y2JseHVYSFJoYkhCb1lXSmxkQzVtYjNKRllXTm9LR3hsZEhSbGNpQTlQaUI3WEc1Y2RGeDBiR1YwSUNSbWFYSnpkRVZ1ZEhKNUlEMGdabWx1WkVacGNuTjBSVzUwY25rb2JHVjBkR1Z5S1R0Y2JseDBYSFJzWlhRZ0pHRnVZMmh2Y2lBOUlHUnZZM1Z0Wlc1MExtTnlaV0YwWlVWc1pXMWxiblFvSjJFbktUdGNibHh1WEhSY2RHbG1JQ2doSkdacGNuTjBSVzUwY25rcElISmxkSFZ5Ymp0Y2JseHVYSFJjZENSbWFYSnpkRVZ1ZEhKNUxtbGtJRDBnYkdWMGRHVnlPMXh1WEhSY2RDUmhibU5vYjNJdWFXNXVaWEpJVkUxTUlEMGdiR1YwZEdWeUxuUnZWWEJ3WlhKRFlYTmxLQ2s3WEc1Y2RGeDBKR0Z1WTJodmNpNWpiR0Z6YzA1aGJXVWdQU0FuWVd4d2FHRmlaWFJmWDJ4bGRIUmxjaTFoYm1Ob2IzSW5PMXh1WEc1Y2RGeDBZWFIwWVdOb1FXNWphRzl5VEdsemRHVnVaWElvSkdGdVkyaHZjaXdnYkdWMGRHVnlLVHRjYmx4MFhIUWtiM1YwWlhJdVlYQndaVzVrUTJocGJHUW9KR0Z1WTJodmNpazdYRzVjZEgwcE8xeHVmVHRjYmx4dVkyOXVjM1FnY21WdVpHVnlTVzFoWjJWeklEMGdLR2x0WVdkbGN5d2dKR2x0WVdkbGN5a2dQVDRnZTF4dVhIUnBiV0ZuWlhNdVptOXlSV0ZqYUNocGJXRm5aU0E5UGlCN1hHNWNkRngwWTI5dWMzUWdjM0pqSUQwZ1lDNHVMeTR1TDJGemMyVjBjeTlwYldGblpYTXZKSHRwYldGblpYMWdPMXh1WEhSY2RHTnZibk4wSUNScGJXZFBkWFJsY2lBOUlHUnZZM1Z0Wlc1MExtTnlaV0YwWlVWc1pXMWxiblFvSjJScGRpY3BPMXh1WEhSY2RHTnZibk4wSUNScGJXY2dQU0JrYjJOMWJXVnVkQzVqY21WaGRHVkZiR1Z0Wlc1MEtDZEpUVWNuS1R0Y2JseDBYSFFrYVcxbkxtTnNZWE56VG1GdFpTQTlJQ2RoY25ScFkyeGxMV2x0WVdkbEp6dGNibHgwWEhRa2FXMW5Mbk55WXlBOUlITnlZenRjYmx4MFhIUWthVzFuVDNWMFpYSXVZWEJ3Wlc1a1EyaHBiR1FvSkdsdFp5azdYRzVjZEZ4MEpHbHRZV2RsY3k1aGNIQmxibVJEYUdsc1pDZ2thVzFuVDNWMFpYSXBPMXh1WEhSOUtWeHVmVHRjYmx4dVkyOXVjM1FnY21WdVpHVnlSVzUwY21sbGN5QTlJQ2dwSUQwK0lIdGNibHgwWTI5dWMzUWdKR0Z5ZEdsamJHVk1hWE4wSUQwZ1pHOWpkVzFsYm5RdVoyVjBSV3hsYldWdWRFSjVTV1FvSjJwekxXeHBjM1FuS1R0Y2JseDBZMjl1YzNRZ1pXNTBjbWxsYzB4cGMzUWdQU0J6YjNKMFMyVjVJRDhnWlc1MGNtbGxjeTVpZVZScGRHeGxJRG9nWlc1MGNtbGxjeTVpZVVGMWRHaHZjanRjYmx4dVhIUWtZWEowYVdOc1pVeHBjM1F1YVc1dVpYSklWRTFNSUQwZ0p5YzdYRzVjYmx4MFpXNTBjbWxsYzB4cGMzUXVabTl5UldGamFDaGxiblJ5ZVNBOVBpQjdYRzVjZEZ4MFkyOXVjM1FnZXlCMGFYUnNaU3dnYkdGemRFNWhiV1VzSUdacGNuTjBUbUZ0WlN3Z2FXMWhaMlZ6TENCa1pYTmpjbWx3ZEdsdmJpd2daR1YwWVdsc0lIMGdQU0JsYm5SeWVUdGNibHh1WEhSY2RDUmhjblJwWTJ4bFRHbHpkQzVwYm5ObGNuUkJaR3BoWTJWdWRFaFVUVXdvSjJKbFptOXlaV1Z1WkNjc0lHRnlkR2xqYkdWVVpXMXdiR0YwWlNrN1hHNWNibHgwWEhSamIyNXpkQ0FrWVd4c1UyeHBaR1Z5Y3lBOUlHUnZZM1Z0Wlc1MExuRjFaWEo1VTJWc1pXTjBiM0pCYkd3b0p5NWhjblJwWTJ4bFgxOXpiR2xrWlhJdGFXNXVaWEluS1R0Y2JseDBYSFJqYjI1emRDQWtjMnhwWkdWeUlEMGdKR0ZzYkZOc2FXUmxjbk5iSkdGc2JGTnNhV1JsY25NdWJHVnVaM1JvSUMwZ01WMDdYRzVjZEZ4MEx5OGdZMjl1YzNRZ0pHbHRZV2RsY3lBOUlDUnpiR2xrWlhJdWNYVmxjbmxUWld4bFkzUnZjaWduTG1GeWRHbGpiR1ZmWDJsdFlXZGxjeWNwTzF4dVhHNWNkRngwYVdZZ0tHbHRZV2RsY3k1c1pXNW5kR2dwSUhKbGJtUmxja2x0WVdkbGN5aHBiV0ZuWlhNc0lDUnpiR2xrWlhJcE8xeHVYSFJjZEZ4dVhIUmNkR052Ym5OMElDUmtaWE5qY21sd2RHbHZiazkxZEdWeUlEMGdaRzlqZFcxbGJuUXVZM0psWVhSbFJXeGxiV1Z1ZENnblpHbDJKeWs3WEc1Y2RGeDBZMjl1YzNRZ0pHUmxjMk55YVhCMGFXOXVUbTlrWlNBOUlHUnZZM1Z0Wlc1MExtTnlaV0YwWlVWc1pXMWxiblFvSjNBbktUdGNibHgwWEhSamIyNXpkQ0FrWkdWMFlXbHNUbTlrWlNBOUlHUnZZM1Z0Wlc1MExtTnlaV0YwWlVWc1pXMWxiblFvSjNBbktUdGNibHgwWEhRa1pHVnpZM0pwY0hScGIyNVBkWFJsY2k1amJHRnpjMHhwYzNRdVlXUmtLQ2RoY25ScFkyeGxMV1JsYzJOeWFYQjBhVzl1WDE5dmRYUmxjaWNwTzF4dVhIUmNkQ1JrWlhOamNtbHdkR2x2Yms1dlpHVXVZMnhoYzNOTWFYTjBMbUZrWkNnbllYSjBhV05zWlMxa1pYTmpjbWx3ZEdsdmJpY3BPMXh1WEhSY2RDUmtaWFJoYVd4T2IyUmxMbU5zWVhOelRHbHpkQzVoWkdRb0oyRnlkR2xqYkdVdFpHVjBZV2xzSnlrN1hHNWNibHgwWEhRa1pHVnpZM0pwY0hScGIyNU9iMlJsTG1sdWJtVnlTRlJOVENBOUlHUmxjMk55YVhCMGFXOXVPMXh1WEhSY2RDUmtaWFJoYVd4T2IyUmxMbWx1Ym1WeVNGUk5UQ0E5SUdSbGRHRnBiRHRjYmx4dVhIUmNkQ1JrWlhOamNtbHdkR2x2Yms5MWRHVnlMbUZ3Y0dWdVpFTm9hV3hrS0NSa1pYTmpjbWx3ZEdsdmJrNXZaR1VzSUNSa1pYUmhhV3hPYjJSbEtUdGNibHgwWEhRa2MyeHBaR1Z5TG1Gd2NHVnVaRU5vYVd4a0tDUmtaWE5qY21sd2RHbHZiazkxZEdWeUtUdGNibHh1WEhSY2RHTnZibk4wSUNSMGFYUnNaVTV2WkdWeklEMGdaRzlqZFcxbGJuUXVjWFZsY25sVFpXeGxZM1J2Y2tGc2JDZ25MbUZ5ZEdsamJHVXRhR1ZoWkdsdVoxOWZkR2wwYkdVbktUdGNibHgwWEhSamIyNXpkQ0FrZEdsMGJHVWdQU0FrZEdsMGJHVk9iMlJsYzFza2RHbDBiR1ZPYjJSbGN5NXNaVzVuZEdnZ0xTQXhYVHRjYmx4dVhIUmNkR052Ym5OMElDUm1hWEp6ZEU1dlpHVnpJRDBnWkc5amRXMWxiblF1Y1hWbGNubFRaV3hsWTNSdmNrRnNiQ2duTG1GeWRHbGpiR1V0YUdWaFpHbHVaMTlmYm1GdFpTMHRabWx5YzNRbktUdGNibHgwWEhSamIyNXpkQ0FrWm1seWMzUWdQU0FrWm1seWMzUk9iMlJsYzFza1ptbHljM1JPYjJSbGN5NXNaVzVuZEdnZ0xTQXhYVHRjYmx4dVhIUmNkR052Ym5OMElDUnNZWE4wVG05a1pYTWdQU0JrYjJOMWJXVnVkQzV4ZFdWeWVWTmxiR1ZqZEc5eVFXeHNLQ2N1WVhKMGFXTnNaUzFvWldGa2FXNW5YMTl1WVcxbExTMXNZWE4wSnlrN1hHNWNkRngwWTI5dWMzUWdKR3hoYzNRZ1BTQWtiR0Z6ZEU1dlpHVnpXeVJzWVhOMFRtOWtaWE11YkdWdVozUm9JQzBnTVYwN1hHNWNibHgwWEhRa2RHbDBiR1V1YVc1dVpYSklWRTFNSUQwZ2RHbDBiR1U3WEc1Y2RGeDBKR1pwY25OMExtbHVibVZ5U0ZSTlRDQTlJR1pwY25OMFRtRnRaVHRjYmx4MFhIUWtiR0Z6ZEM1cGJtNWxja2hVVFV3Z1BTQnNZWE4wVG1GdFpUdGNibHh1WEhSY2RHTnZibk4wSUNSaGNuSnZkMDVsZUhRZ1BTQWtjMnhwWkdWeUxuQmhjbVZ1ZEVWc1pXMWxiblF1Y1hWbGNubFRaV3hsWTNSdmNpZ25MbUZ5Y205M0xXNWxlSFFuS1R0Y2JseDBYSFJqYjI1emRDQWtZWEp5YjNkUWNtVjJJRDBnSkhOc2FXUmxjaTV3WVhKbGJuUkZiR1Z0Wlc1MExuRjFaWEo1VTJWc1pXTjBiM0lvSnk1aGNuSnZkeTF3Y21WMkp5azdYRzVjYmx4MFhIUnNaWFFnWTNWeWNtVnVkQ0E5SUNSemJHbGtaWEl1Wm1seWMzUkZiR1Z0Wlc1MFEyaHBiR1E3WEc1Y2RGeDBKR0Z5Y205M1RtVjRkQzVoWkdSRmRtVnVkRXhwYzNSbGJtVnlLQ2RqYkdsamF5Y3NJQ2dwSUQwK0lIdGNibHgwWEhSY2RHTnZibk4wSUc1bGVIUWdQU0JqZFhKeVpXNTBMbTVsZUhSRmJHVnRaVzUwVTJsaWJHbHVaenRjYmx4MFhIUmNkR2xtSUNodVpYaDBLU0I3WEc1Y2RGeDBYSFJjZEc1bGVIUXVjMk55YjJ4c1NXNTBiMVpwWlhjb2UySmxhR0YyYVc5eU9pQmNJbk50YjI5MGFGd2lMQ0JpYkc5amF6b2dYQ0p1WldGeVpYTjBYQ0lzSUdsdWJHbHVaVG9nWENKalpXNTBaWEpjSW4wcE8xeHVYSFJjZEZ4MFhIUmpkWEp5Wlc1MElEMGdibVY0ZER0Y2JseDBYSFJjZEgxY2JseDBYSFI5S1R0Y2JseHVYSFJjZENSaGNuSnZkMUJ5WlhZdVlXUmtSWFpsYm5STWFYTjBaVzVsY2lnblkyeHBZMnNuTENBb0tTQTlQaUI3WEc1Y2RGeDBYSFJqYjI1emRDQndjbVYySUQwZ1kzVnljbVZ1ZEM1d2NtVjJhVzkxYzBWc1pXMWxiblJUYVdKc2FXNW5PMXh1WEhSY2RGeDBhV1lnS0hCeVpYWXBJSHRjYmx4MFhIUmNkRngwY0hKbGRpNXpZM0p2Ykd4SmJuUnZWbWxsZHloN1ltVm9ZWFpwYjNJNklGd2ljMjF2YjNSb1hDSXNJR0pzYjJOck9pQmNJbTVsWVhKbGMzUmNJaXdnYVc1c2FXNWxPaUJjSW1ObGJuUmxjbHdpZlNrN1hHNWNkRngwWEhSY2RHTjFjbkpsYm5RZ1BTQndjbVYyTzF4dVhIUmNkRngwZlZ4dVhIUmNkSDBwWEc1Y2RIMHBPMXh1WEc1Y2RHRjBkR0ZqYUVsdFlXZGxUR2x6ZEdWdVpYSnpLQ2s3WEc1Y2RHMWhhMlZCYkhCb1lXSmxkQ2dwTzF4dWZUdGNibHh1THk4Z2RHaHBjeUJ1WldWa2N5QjBieUJpWlNCaElHUmxaWEJsY2lCemIzSjBYRzVqYjI1emRDQnpiM0owUW5sVWFYUnNaU0E5SUNncElEMCtJSHRjYmx4MFpXNTBjbWxsY3k1aWVWUnBkR3hsTG5OdmNuUW9LR0VzSUdJcElEMCtJSHRjYmx4MFhIUnNaWFFnWVZScGRHeGxJRDBnWVM1MGFYUnNaVnN3WFM1MGIxVndjR1Z5UTJGelpTZ3BPMXh1WEhSY2RHeGxkQ0JpVkdsMGJHVWdQU0JpTG5ScGRHeGxXekJkTG5SdlZYQndaWEpEWVhObEtDazdYRzVjZEZ4MGFXWWdLR0ZVYVhSc1pTQStJR0pVYVhSc1pTa2djbVYwZFhKdUlERTdYRzVjZEZ4MFpXeHpaU0JwWmlBb1lWUnBkR3hsSUR3Z1lsUnBkR3hsS1NCeVpYUjFjbTRnTFRFN1hHNWNkRngwWld4elpTQnlaWFIxY200Z01EdGNibHgwZlNrN1hHNTlPMXh1WEc1amIyNXpkQ0J6WlhSRVlYUmhJRDBnS0dSaGRHRXBJRDArSUh0Y2JseDBaVzUwY21sbGN5NWllVUYxZEdodmNpQTlJR1JoZEdFN1hHNWNkR1Z1ZEhKcFpYTXVZbmxVYVhSc1pTQTlJR1JoZEdFdWMyeHBZMlVvS1RzZ0x5OGdZMjl3YVdWeklHUmhkR0VnWm05eUlHSjVWR2wwYkdVZ2MyOXlkRnh1WEc1Y2RITnZjblJDZVZScGRHeGxLQ2s3WEc1Y2RISmxibVJsY2tWdWRISnBaWE1vS1R0Y2JuMDdYRzVjYm1OdmJuTjBJR1psZEdOb1JHRjBZU0E5SUNncElEMCtJSHRjYmx4MFptVjBZMmdvUkVJcExuUm9aVzRvY21WeklEMCtJSEpsY3k1cWMyOXVLQ2twWEc1Y2RDNTBhR1Z1S0dSaGRHRWdQVDRnZTF4dVhIUmNkSE5sZEVSaGRHRW9aR0YwWVNrN1hHNWNkRngwYUdsa1pVeHZZV1JwYm1jb0tUdGNibHgwZlNsY2JseDBMbU5oZEdOb0tHVnljaUE5UGlCamIyNXpiMnhsTG5kaGNtNG9aWEp5S1NrN1hHNTlPMXh1WEc1amIyNXpkQ0JwYm1sMElEMGdLQ2tnUFQ0Z2UxeHVYSFJ6Ylc5dmRHaHpZM0p2Ykd3dWNHOXNlV1pwYkd3b0tUdGNibHgwWm1WMFkyaEVZWFJoS0NrN1hHNWNkRzVoZGt4bktDazdYRzVjZEdGa1pGTnZjblJDZFhSMGIyNU1hWE4wWlc1bGNuTW9LVHRjYmx4MFlYUjBZV05vUVhKeWIzZE1hWE4wWlc1bGNuTW9LVHRjYmx4MFlYUjBZV05vVFc5a1lXeE1hWE4wWlc1bGNuTW9LVHRjYm4xY2JseHVhVzVwZENncE8xeHVJaXdpWTI5dWMzUWdZWEowYVdOc1pWUmxiWEJzWVhSbElEMGdZRnh1WEhROFlYSjBhV05zWlNCamJHRnpjejFjSW1GeWRHbGpiR1ZmWDI5MWRHVnlYQ0krWEc1Y2RGeDBQR1JwZGlCamJHRnpjejFjSW1GeWRHbGpiR1ZmWDJsdWJtVnlYQ0krWEc1Y2RGeDBYSFE4WkdsMklHTnNZWE56UFZ3aVlYSjBhV05zWlY5ZmFHVmhaR2x1WjF3aVBseHVYSFJjZEZ4MFhIUThZU0JqYkdGemN6MWNJbXB6TFdWdWRISjVMWFJwZEd4bFhDSStQQzloUGx4dVhIUmNkRngwWEhROGFESWdZMnhoYzNNOVhDSmhjblJwWTJ4bExXaGxZV1JwYm1kZlgzUnBkR3hsWENJK1BDOW9NajVjYmx4MFhIUmNkRngwUEdScGRpQmpiR0Z6Y3oxY0ltRnlkR2xqYkdVdGFHVmhaR2x1WjE5ZmJtRnRaVndpUGx4dVhIUmNkRngwWEhSY2REeHpjR0Z1SUdOc1lYTnpQVndpWVhKMGFXTnNaUzFvWldGa2FXNW5YMTl1WVcxbExTMW1hWEp6ZEZ3aVBqd3ZjM0JoYmo1Y2JseDBYSFJjZEZ4MFhIUThZU0JqYkdGemN6MWNJbXB6TFdWdWRISjVMV0Z5ZEdsemRGd2lQand2WVQ1Y2JseDBYSFJjZEZ4MFhIUThjM0JoYmlCamJHRnpjejFjSW1GeWRHbGpiR1V0YUdWaFpHbHVaMTlmYm1GdFpTMHRiR0Z6ZEZ3aVBqd3ZjM0JoYmo1Y2JseDBYSFJjZEZ4MFBDOWthWFkrWEc1Y2RGeDBYSFE4TDJScGRqNWNkRnh1WEhSY2RGeDBQR1JwZGlCamJHRnpjejFjSW1GeWRHbGpiR1ZmWDNOc2FXUmxjaTF2ZFhSbGNsd2lQbHh1WEhSY2RGeDBYSFE4WkdsMklHTnNZWE56UFZ3aVlYSjBhV05zWlY5ZmMyeHBaR1Z5TFdsdWJtVnlYQ0krUEM5a2FYWStYRzVjZEZ4MFhIUmNkRHhrYVhZZ1kyeGhjM005WENKaGNuUnBZMnhsWDE5elkzSnZiR3d0WTI5dWRISnZiSE5jSWo1Y2JseDBYSFJjZEZ4MFhIUThjM0JoYmlCamJHRnpjejFjSW1OdmJuUnliMnh6SUdGeWNtOTNMWEJ5WlhaY0lqN2locEE4TDNOd1lXNCtJRnh1WEhSY2RGeDBYSFJjZER4emNHRnVJR05zWVhOelBWd2lZMjl1ZEhKdmJITWdZWEp5YjNjdGJtVjRkRndpUHVLR2tqd3ZjM0JoYmo1Y2JseDBYSFJjZEZ4MFBDOWthWFkrWEc1Y2RGeDBYSFJjZER4d0lHTnNZWE56UFZ3aWFuTXRZWEowYVdOc1pTMWhibU5vYjNJdGRHRnlaMlYwWENJK1BDOXdQbHh1WEhSY2REd3ZaR2wyUGx4dVhIUThMMkZ5ZEdsamJHVStYRzVnTzF4dVhHNWxlSEJ2Y25RZ1pHVm1ZWFZzZENCaGNuUnBZMnhsVkdWdGNHeGhkR1U3SWl3aWFXMXdiM0owSUdGeWRHbGpiR1ZVWlcxd2JHRjBaU0JtY205dElDY3VMMkZ5ZEdsamJHVW5PMXh1YVcxd2IzSjBJRzVoZGt4bklHWnliMjBnSnk0dmJtRjJUR2NuTzF4dVhHNWxlSEJ2Y25RZ2V5QmhjblJwWTJ4bFZHVnRjR3hoZEdVc0lHNWhka3huSUgwN0lpd2lZMjl1YzNRZ2RHVnRjR3hoZEdVZ1BTQmNibHgwWUR4a2FYWWdZMnhoYzNNOVhDSnVZWFpmWDJsdWJtVnlYQ0krWEc1Y2RGeDBQR1JwZGlCamJHRnpjejFjSW01aGRsOWZjMjl5ZEMxaWVWd2lQbHh1WEhSY2RGeDBQSE53WVc0Z1kyeGhjM005WENKemIzSjBMV0o1WDE5MGFYUnNaVndpUGxOdmNuUWdZbms4TDNOd1lXNCtYRzVjZEZ4MFhIUThZblYwZEc5dUlHTnNZWE56UFZ3aWMyOXlkQzFpZVNCemIzSjBMV0o1WDE5aWVTMWhjblJwYzNRZ1lXTjBhWFpsWENJZ2FXUTlYQ0pxY3kxaWVTMWhjblJwYzNSY0lqNUJjblJwYzNROEwySjFkSFJ2Ymo1Y2JseDBYSFJjZER4emNHRnVJR05zWVhOelBWd2ljMjl5ZEMxaWVWOWZaR2wyYVdSbGNsd2lQaUI4SUR3dmMzQmhiajVjYmx4MFhIUmNkRHhpZFhSMGIyNGdZMnhoYzNNOVhDSnpiM0owTFdKNUlITnZjblF0WW5sZlgySjVMWFJwZEd4bFhDSWdhV1E5WENKcWN5MWllUzEwYVhSc1pWd2lQbFJwZEd4bFBDOWlkWFIwYjI0K1hHNWNkRngwWEhROGMzQmhiaUJqYkdGemN6MWNJbVpwYm1SY0lpQnBaRDFjSW1wekxXWnBibVJjSWo1Y2JseDBYSFJjZEZ4MEtEeHpjR0Z1SUdOc1lYTnpQVndpWm1sdVpDMHRhVzV1WlhKY0lqNG1Jemc1T0RRN1Jqd3ZjM0JoYmo0cFhHNWNkRngwWEhROEwzTndZVzQrWEc1Y2RGeDBQQzlrYVhZK1hHNWNkRngwUEdScGRpQmpiR0Z6Y3oxY0ltNWhkbDlmWVd4d2FHRmlaWFJjSWo1Y2JseDBYSFJjZER4emNHRnVJR05zWVhOelBWd2lZV3h3YUdGaVpYUmZYM1JwZEd4bFhDSStSMjhnZEc4OEwzTndZVzQrWEc1Y2RGeDBYSFE4WkdsMklHTnNZWE56UFZ3aVlXeHdhR0ZpWlhSZlgyeGxkSFJsY25OY0lqNDhMMlJwZGo1Y2JseDBYSFE4TDJScGRqNWNibHgwUEM5a2FYWStZRHRjYmx4dVkyOXVjM1FnYm1GMlRHY2dQU0FvS1NBOVBpQjdYRzVjZEd4bGRDQnVZWFpQZFhSbGNpQTlJR1J2WTNWdFpXNTBMbWRsZEVWc1pXMWxiblJDZVVsa0tDZHFjeTF1WVhZbktUdGNibHgwYm1GMlQzVjBaWEl1YVc1dVpYSklWRTFNSUQwZ2RHVnRjR3hoZEdVN1hHNTlPMXh1WEc1bGVIQnZjblFnWkdWbVlYVnNkQ0J1WVhaTVp6c2lMQ0pwYlhCdmNuUWdleUFrYkc5aFpHbHVaeXdnSkc1aGRpd2dKSEJoY21Gc2JHRjRMQ0FrWTI5dWRHVnVkQ3dnSkhScGRHeGxMQ0FrWVhKeWIzY3NJQ1J0YjJSaGJDd2dKR3hwWjJoMFltOTRMQ0FrZG1sbGR5QjlJR1p5YjIwZ0p5NHVMMk52Ym5OMFlXNTBjeWM3WEc1Y2JtTnZibk4wSUdSbFltOTFibU5sSUQwZ0tHWnVMQ0IwYVcxbEtTQTlQaUI3WEc0Z0lHeGxkQ0IwYVcxbGIzVjBPMXh1WEc0Z0lISmxkSFZ5YmlCbWRXNWpkR2x2YmlncElIdGNiaUFnSUNCamIyNXpkQ0JtZFc1amRHbHZia05oYkd3Z1BTQW9LU0E5UGlCbWJpNWhjSEJzZVNoMGFHbHpMQ0JoY21kMWJXVnVkSE1wTzF4dUlDQWdJRnh1SUNBZ0lHTnNaV0Z5VkdsdFpXOTFkQ2gwYVcxbGIzVjBLVHRjYmlBZ0lDQjBhVzFsYjNWMElEMGdjMlYwVkdsdFpXOTFkQ2htZFc1amRHbHZia05oYkd3c0lIUnBiV1VwTzF4dUlDQjlYRzU5TzF4dVhHNWpiMjV6ZENCb2FXUmxURzloWkdsdVp5QTlJQ2dwSUQwK0lIdGNibHgwSkd4dllXUnBibWN1Wm05eVJXRmphQ2hsYkdWdElEMCtJSHRjYmx4MFhIUmxiR1Z0TG1Oc1lYTnpUR2x6ZEM1eVpXMXZkbVVvSjJ4dllXUnBibWNuS1R0Y2JseDBYSFJsYkdWdExtTnNZWE56VEdsemRDNWhaR1FvSjNKbFlXUjVKeWs3WEc1Y2RIMHBPMXh1WEhRa2JtRjJMbU5zWVhOelRHbHpkQzVoWkdRb0ozSmxZV1I1SnlrN1hHNTlPMXh1WEc1bGVIQnZjblFnZXlCa1pXSnZkVzVqWlN3Z2FHbGtaVXh2WVdScGJtY2dmVHNpWFgwPSJ9
