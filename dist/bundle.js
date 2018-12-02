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
"use strict";

Object.defineProperty(exports, "__esModule", {
	value: true
});
var articleTemplate = "\n\t<article class=\"article__outer\">\n\t\t<div class=\"article__inner\">\n\t\t\t<div class=\"article__heading\">\n\t\t\t\t<a class=\"js-entry-title\"></a>\n\t\t\t\t<h2 class=\"article-heading__title\"></h2>\n\t\t\t\t<div class=\"article-heading__name\">\n\t\t\t\t\t<span class=\"article-heading__name--first\"></span>\n\t\t\t\t\t<a class=\"js-entry-artist\"></a>\n\t\t\t\t\t<span class=\"article-heading__name--last\"></span>\n\t\t\t\t</div>\n\t\t\t</div>\t\n\t\t\t<div class=\"article__slider-outer\">\n\t\t\t\t<div class=\"article__slider-inner\"></div>\n\t\t\t\t<div class=\"article__scroll-controls\">\n\t\t\t\t\t<span class=\"controls arrow-prev\">\u2190</span> \n\t\t\t\t\t<span class=\"controls arrow-next\">\u2192</span>\n\t\t\t\t</div>\n\t\t\t\t<p class=\"js-article-anchor-target\"></p>\n\t\t</div>\n\t</article>\n";

exports.default = articleTemplate;

},{}],3:[function(require,module,exports){
'use strict';

var _smoothscrollPolyfill = require('smoothscroll-polyfill');

var _smoothscrollPolyfill2 = _interopRequireDefault(_smoothscrollPolyfill);

var _navLg = require('./nav-lg');

var _navLg2 = _interopRequireDefault(_navLg);

var _articleTemplate = require('./article-template');

var _articleTemplate2 = _interopRequireDefault(_articleTemplate);

var _utils = require('./utils');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

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

var sortKey = 0; // 0 = artist, 1 = title
var entries = { byAuthor: [], byTitle: [] };
var currentLetter = 'A';

var lightbox = false;
var x2 = false;
var attachImageListeners = function attachImageListeners() {
	var $images = Array.from(document.querySelectorAll('.article-image'));

	$images.forEach(function (img) {
		img.addEventListener('click', function (evt) {
			if (!lightbox) {
				var src = img.src;

				$lightbox.classList.add('show-img');
				$view.setAttribute('style', 'background-image: url(' + src + ')');
				lightbox = true;
			}
		});
	});

	$view.addEventListener('click', function () {
		if (lightbox) {
			$lightbox.classList.remove('show-img');
			lightbox = false;
		}
	});
};

var modal = false;
var attachModalListeners = function attachModalListeners() {
	var $find = document.getElementById('js-find');

	$find.addEventListener('click', function () {
		$modal.classList.add('show');
		modal = true;
	});

	$modal.addEventListener('click', function () {
		$modal.classList.remove('show');
		modal = false;
	});

	window.addEventListener('keydown', function () {
		if (modal) {
			setTimeout(function () {
				$modal.classList.remove('show');
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
	$arrow.addEventListener('click', function () {
		scrollToTop();
	});

	$parallax.addEventListener('scroll', function () {

		var y = $title.getBoundingClientRect().y;
		if (current !== y) {
			prev = current;
			current = y;
		}

		if (y <= -50 && !isShowing) {
			$arrow.classList.add('show');
			isShowing = true;
		} else if (y > -50 && isShowing) {
			$arrow.classList.remove('show');
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


		$articleList.insertAdjacentHTML('beforeend', _articleTemplate2.default);

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
	fetch(DB).then(function (res) {
		return res.json();
	}).then(function (data) {
		setData(data);
	}).then(function () {
		$loading.forEach(function (elem) {
			return elem.classList.add('ready');
		});
		$nav.classList.add('ready');
	}).catch(function (err) {
		return console.warn(err);
	});
};

var init = function init() {
	_smoothscrollPolyfill2.default.polyfill();
	fetchData();
	(0, _navLg2.default)();
	renderEntries();
	addSortButtonListeners();
	attachArrowListeners();
	attachModalListeners();
};

init();

},{"./article-template":2,"./nav-lg":4,"./utils":5,"smoothscroll-polyfill":1}],4:[function(require,module,exports){
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

},{}],5:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
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

exports.debounce = debounce;

},{}]},{},[3])

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvc21vb3Roc2Nyb2xsLXBvbHlmaWxsL2Rpc3Qvc21vb3Roc2Nyb2xsLmpzIiwic3JjL2pzL2FydGljbGUtdGVtcGxhdGUuanMiLCJzcmMvanMvaW5kZXguanMiLCJzcmMvanMvbmF2LWxnLmpzIiwic3JjL2pzL3V0aWxzL2luZGV4LmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNB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LElBRkYsQ0FFTyxnQkFBUTtBQUNkLFVBQVEsSUFBUjtBQUNBLEVBSkQsRUFLQyxJQUxELENBS00sWUFBTTtBQUNYLFdBQVMsT0FBVCxDQUFpQjtBQUFBLFVBQVEsS0FBSyxTQUFMLENBQWUsR0FBZixDQUFtQixPQUFuQixDQUFSO0FBQUEsR0FBakI7QUFDQSxPQUFLLFNBQUwsQ0FBZSxHQUFmLENBQW1CLE9BQW5CO0FBQ0EsRUFSRCxFQVNDLEtBVEQsQ0FTTztBQUFBLFNBQU8sUUFBUSxJQUFSLENBQWEsR0FBYixDQUFQO0FBQUEsRUFUUDtBQVVELENBWEQ7O0FBYUEsSUFBTSxPQUFPLFNBQVAsSUFBTyxHQUFNO0FBQ2xCLGdDQUFhLFFBQWI7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxDQVJEOztBQVVBOzs7Ozs7OztBQ2pUQSxJQUFNLG1tQkFBTjs7QUFpQkEsSUFBTSxRQUFRLFNBQVIsS0FBUSxHQUFNO0FBQ25CLEtBQUksV0FBVyxTQUFTLGNBQVQsQ0FBd0IsUUFBeEIsQ0FBZjtBQUNBLFVBQVMsU0FBVCxHQUFxQixRQUFyQjtBQUNBLENBSEQ7O2tCQUtlLEs7Ozs7Ozs7O0FDdEJmLElBQU0sV0FBVyxTQUFYLFFBQVcsQ0FBQyxFQUFELEVBQUssSUFBTCxFQUFjO0FBQzdCLE1BQUksZ0JBQUo7O0FBRUEsU0FBTyxZQUFXO0FBQUE7QUFBQTs7QUFDaEIsUUFBTSxlQUFlLFNBQWYsWUFBZTtBQUFBLGFBQU0sR0FBRyxLQUFILENBQVMsS0FBVCxFQUFlLFVBQWYsQ0FBTjtBQUFBLEtBQXJCOztBQUVBLGlCQUFhLE9BQWI7QUFDQSxjQUFVLFdBQVcsWUFBWCxFQUF5QixJQUF6QixDQUFWO0FBQ0QsR0FMRDtBQU1ELENBVEQ7O1FBV1MsUSxHQUFBLFEiLCJmaWxlIjoiYnVuZGxlLmpzIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uKCl7ZnVuY3Rpb24gcihlLG4sdCl7ZnVuY3Rpb24gbyhpLGYpe2lmKCFuW2ldKXtpZighZVtpXSl7dmFyIGM9XCJmdW5jdGlvblwiPT10eXBlb2YgcmVxdWlyZSYmcmVxdWlyZTtpZighZiYmYylyZXR1cm4gYyhpLCEwKTtpZih1KXJldHVybiB1KGksITApO3ZhciBhPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIraStcIidcIik7dGhyb3cgYS5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGF9dmFyIHA9bltpXT17ZXhwb3J0czp7fX07ZVtpXVswXS5jYWxsKHAuZXhwb3J0cyxmdW5jdGlvbihyKXt2YXIgbj1lW2ldWzFdW3JdO3JldHVybiBvKG58fHIpfSxwLHAuZXhwb3J0cyxyLGUsbix0KX1yZXR1cm4gbltpXS5leHBvcnRzfWZvcih2YXIgdT1cImZ1bmN0aW9uXCI9PXR5cGVvZiByZXF1aXJlJiZyZXF1aXJlLGk9MDtpPHQubGVuZ3RoO2krKylvKHRbaV0pO3JldHVybiBvfXJldHVybiByfSkoKSIsIi8qIHNtb290aHNjcm9sbCB2MC40LjAgLSAyMDE4IC0gRHVzdGFuIEthc3RlbiwgSmVyZW1pYXMgTWVuaWNoZWxsaSAtIE1JVCBMaWNlbnNlICovXG4oZnVuY3Rpb24gKCkge1xuICAndXNlIHN0cmljdCc7XG5cbiAgLy8gcG9seWZpbGxcbiAgZnVuY3Rpb24gcG9seWZpbGwoKSB7XG4gICAgLy8gYWxpYXNlc1xuICAgIHZhciB3ID0gd2luZG93O1xuICAgIHZhciBkID0gZG9jdW1lbnQ7XG5cbiAgICAvLyByZXR1cm4gaWYgc2Nyb2xsIGJlaGF2aW9yIGlzIHN1cHBvcnRlZCBhbmQgcG9seWZpbGwgaXMgbm90IGZvcmNlZFxuICAgIGlmIChcbiAgICAgICdzY3JvbGxCZWhhdmlvcicgaW4gZC5kb2N1bWVudEVsZW1lbnQuc3R5bGUgJiZcbiAgICAgIHcuX19mb3JjZVNtb290aFNjcm9sbFBvbHlmaWxsX18gIT09IHRydWVcbiAgICApIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICAvLyBnbG9iYWxzXG4gICAgdmFyIEVsZW1lbnQgPSB3LkhUTUxFbGVtZW50IHx8IHcuRWxlbWVudDtcbiAgICB2YXIgU0NST0xMX1RJTUUgPSA0Njg7XG5cbiAgICAvLyBvYmplY3QgZ2F0aGVyaW5nIG9yaWdpbmFsIHNjcm9sbCBtZXRob2RzXG4gICAgdmFyIG9yaWdpbmFsID0ge1xuICAgICAgc2Nyb2xsOiB3LnNjcm9sbCB8fCB3LnNjcm9sbFRvLFxuICAgICAgc2Nyb2xsQnk6IHcuc2Nyb2xsQnksXG4gICAgICBlbGVtZW50U2Nyb2xsOiBFbGVtZW50LnByb3RvdHlwZS5zY3JvbGwgfHwgc2Nyb2xsRWxlbWVudCxcbiAgICAgIHNjcm9sbEludG9WaWV3OiBFbGVtZW50LnByb3RvdHlwZS5zY3JvbGxJbnRvVmlld1xuICAgIH07XG5cbiAgICAvLyBkZWZpbmUgdGltaW5nIG1ldGhvZFxuICAgIHZhciBub3cgPVxuICAgICAgdy5wZXJmb3JtYW5jZSAmJiB3LnBlcmZvcm1hbmNlLm5vd1xuICAgICAgICA/IHcucGVyZm9ybWFuY2Uubm93LmJpbmQody5wZXJmb3JtYW5jZSlcbiAgICAgICAgOiBEYXRlLm5vdztcblxuICAgIC8qKlxuICAgICAqIGluZGljYXRlcyBpZiBhIHRoZSBjdXJyZW50IGJyb3dzZXIgaXMgbWFkZSBieSBNaWNyb3NvZnRcbiAgICAgKiBAbWV0aG9kIGlzTWljcm9zb2Z0QnJvd3NlclxuICAgICAqIEBwYXJhbSB7U3RyaW5nfSB1c2VyQWdlbnRcbiAgICAgKiBAcmV0dXJucyB7Qm9vbGVhbn1cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBpc01pY3Jvc29mdEJyb3dzZXIodXNlckFnZW50KSB7XG4gICAgICB2YXIgdXNlckFnZW50UGF0dGVybnMgPSBbJ01TSUUgJywgJ1RyaWRlbnQvJywgJ0VkZ2UvJ107XG5cbiAgICAgIHJldHVybiBuZXcgUmVnRXhwKHVzZXJBZ2VudFBhdHRlcm5zLmpvaW4oJ3wnKSkudGVzdCh1c2VyQWdlbnQpO1xuICAgIH1cblxuICAgIC8qXG4gICAgICogSUUgaGFzIHJvdW5kaW5nIGJ1ZyByb3VuZGluZyBkb3duIGNsaWVudEhlaWdodCBhbmQgY2xpZW50V2lkdGggYW5kXG4gICAgICogcm91bmRpbmcgdXAgc2Nyb2xsSGVpZ2h0IGFuZCBzY3JvbGxXaWR0aCBjYXVzaW5nIGZhbHNlIHBvc2l0aXZlc1xuICAgICAqIG9uIGhhc1Njcm9sbGFibGVTcGFjZVxuICAgICAqL1xuICAgIHZhciBST1VORElOR19UT0xFUkFOQ0UgPSBpc01pY3Jvc29mdEJyb3dzZXIody5uYXZpZ2F0b3IudXNlckFnZW50KSA/IDEgOiAwO1xuXG4gICAgLyoqXG4gICAgICogY2hhbmdlcyBzY3JvbGwgcG9zaXRpb24gaW5zaWRlIGFuIGVsZW1lbnRcbiAgICAgKiBAbWV0aG9kIHNjcm9sbEVsZW1lbnRcbiAgICAgKiBAcGFyYW0ge051bWJlcn0geFxuICAgICAqIEBwYXJhbSB7TnVtYmVyfSB5XG4gICAgICogQHJldHVybnMge3VuZGVmaW5lZH1cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBzY3JvbGxFbGVtZW50KHgsIHkpIHtcbiAgICAgIHRoaXMuc2Nyb2xsTGVmdCA9IHg7XG4gICAgICB0aGlzLnNjcm9sbFRvcCA9IHk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogcmV0dXJucyByZXN1bHQgb2YgYXBwbHlpbmcgZWFzZSBtYXRoIGZ1bmN0aW9uIHRvIGEgbnVtYmVyXG4gICAgICogQG1ldGhvZCBlYXNlXG4gICAgICogQHBhcmFtIHtOdW1iZXJ9IGtcbiAgICAgKiBAcmV0dXJucyB7TnVtYmVyfVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGVhc2Uoaykge1xuICAgICAgcmV0dXJuIDAuNSAqICgxIC0gTWF0aC5jb3MoTWF0aC5QSSAqIGspKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBpbmRpY2F0ZXMgaWYgYSBzbW9vdGggYmVoYXZpb3Igc2hvdWxkIGJlIGFwcGxpZWRcbiAgICAgKiBAbWV0aG9kIHNob3VsZEJhaWxPdXRcbiAgICAgKiBAcGFyYW0ge051bWJlcnxPYmplY3R9IGZpcnN0QXJnXG4gICAgICogQHJldHVybnMge0Jvb2xlYW59XG4gICAgICovXG4gICAgZnVuY3Rpb24gc2hvdWxkQmFpbE91dChmaXJzdEFyZykge1xuICAgICAgaWYgKFxuICAgICAgICBmaXJzdEFyZyA9PT0gbnVsbCB8fFxuICAgICAgICB0eXBlb2YgZmlyc3RBcmcgIT09ICdvYmplY3QnIHx8XG4gICAgICAgIGZpcnN0QXJnLmJlaGF2aW9yID09PSB1bmRlZmluZWQgfHxcbiAgICAgICAgZmlyc3RBcmcuYmVoYXZpb3IgPT09ICdhdXRvJyB8fFxuICAgICAgICBmaXJzdEFyZy5iZWhhdmlvciA9PT0gJ2luc3RhbnQnXG4gICAgICApIHtcbiAgICAgICAgLy8gZmlyc3QgYXJndW1lbnQgaXMgbm90IGFuIG9iamVjdC9udWxsXG4gICAgICAgIC8vIG9yIGJlaGF2aW9yIGlzIGF1dG8sIGluc3RhbnQgb3IgdW5kZWZpbmVkXG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfVxuXG4gICAgICBpZiAodHlwZW9mIGZpcnN0QXJnID09PSAnb2JqZWN0JyAmJiBmaXJzdEFyZy5iZWhhdmlvciA9PT0gJ3Ntb290aCcpIHtcbiAgICAgICAgLy8gZmlyc3QgYXJndW1lbnQgaXMgYW4gb2JqZWN0IGFuZCBiZWhhdmlvciBpcyBzbW9vdGhcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuXG4gICAgICAvLyB0aHJvdyBlcnJvciB3aGVuIGJlaGF2aW9yIGlzIG5vdCBzdXBwb3J0ZWRcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXG4gICAgICAgICdiZWhhdmlvciBtZW1iZXIgb2YgU2Nyb2xsT3B0aW9ucyAnICtcbiAgICAgICAgICBmaXJzdEFyZy5iZWhhdmlvciArXG4gICAgICAgICAgJyBpcyBub3QgYSB2YWxpZCB2YWx1ZSBmb3IgZW51bWVyYXRpb24gU2Nyb2xsQmVoYXZpb3IuJ1xuICAgICAgKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBpbmRpY2F0ZXMgaWYgYW4gZWxlbWVudCBoYXMgc2Nyb2xsYWJsZSBzcGFjZSBpbiB0aGUgcHJvdmlkZWQgYXhpc1xuICAgICAqIEBtZXRob2QgaGFzU2Nyb2xsYWJsZVNwYWNlXG4gICAgICogQHBhcmFtIHtOb2RlfSBlbFxuICAgICAqIEBwYXJhbSB7U3RyaW5nfSBheGlzXG4gICAgICogQHJldHVybnMge0Jvb2xlYW59XG4gICAgICovXG4gICAgZnVuY3Rpb24gaGFzU2Nyb2xsYWJsZVNwYWNlKGVsLCBheGlzKSB7XG4gICAgICBpZiAoYXhpcyA9PT0gJ1knKSB7XG4gICAgICAgIHJldHVybiBlbC5jbGllbnRIZWlnaHQgKyBST1VORElOR19UT0xFUkFOQ0UgPCBlbC5zY3JvbGxIZWlnaHQ7XG4gICAgICB9XG5cbiAgICAgIGlmIChheGlzID09PSAnWCcpIHtcbiAgICAgICAgcmV0dXJuIGVsLmNsaWVudFdpZHRoICsgUk9VTkRJTkdfVE9MRVJBTkNFIDwgZWwuc2Nyb2xsV2lkdGg7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogaW5kaWNhdGVzIGlmIGFuIGVsZW1lbnQgaGFzIGEgc2Nyb2xsYWJsZSBvdmVyZmxvdyBwcm9wZXJ0eSBpbiB0aGUgYXhpc1xuICAgICAqIEBtZXRob2QgY2FuT3ZlcmZsb3dcbiAgICAgKiBAcGFyYW0ge05vZGV9IGVsXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IGF4aXNcbiAgICAgKiBAcmV0dXJucyB7Qm9vbGVhbn1cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBjYW5PdmVyZmxvdyhlbCwgYXhpcykge1xuICAgICAgdmFyIG92ZXJmbG93VmFsdWUgPSB3LmdldENvbXB1dGVkU3R5bGUoZWwsIG51bGwpWydvdmVyZmxvdycgKyBheGlzXTtcblxuICAgICAgcmV0dXJuIG92ZXJmbG93VmFsdWUgPT09ICdhdXRvJyB8fCBvdmVyZmxvd1ZhbHVlID09PSAnc2Nyb2xsJztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBpbmRpY2F0ZXMgaWYgYW4gZWxlbWVudCBjYW4gYmUgc2Nyb2xsZWQgaW4gZWl0aGVyIGF4aXNcbiAgICAgKiBAbWV0aG9kIGlzU2Nyb2xsYWJsZVxuICAgICAqIEBwYXJhbSB7Tm9kZX0gZWxcbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gYXhpc1xuICAgICAqIEByZXR1cm5zIHtCb29sZWFufVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGlzU2Nyb2xsYWJsZShlbCkge1xuICAgICAgdmFyIGlzU2Nyb2xsYWJsZVkgPSBoYXNTY3JvbGxhYmxlU3BhY2UoZWwsICdZJykgJiYgY2FuT3ZlcmZsb3coZWwsICdZJyk7XG4gICAgICB2YXIgaXNTY3JvbGxhYmxlWCA9IGhhc1Njcm9sbGFibGVTcGFjZShlbCwgJ1gnKSAmJiBjYW5PdmVyZmxvdyhlbCwgJ1gnKTtcblxuICAgICAgcmV0dXJuIGlzU2Nyb2xsYWJsZVkgfHwgaXNTY3JvbGxhYmxlWDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBmaW5kcyBzY3JvbGxhYmxlIHBhcmVudCBvZiBhbiBlbGVtZW50XG4gICAgICogQG1ldGhvZCBmaW5kU2Nyb2xsYWJsZVBhcmVudFxuICAgICAqIEBwYXJhbSB7Tm9kZX0gZWxcbiAgICAgKiBAcmV0dXJucyB7Tm9kZX0gZWxcbiAgICAgKi9cbiAgICBmdW5jdGlvbiBmaW5kU2Nyb2xsYWJsZVBhcmVudChlbCkge1xuICAgICAgdmFyIGlzQm9keTtcblxuICAgICAgZG8ge1xuICAgICAgICBlbCA9IGVsLnBhcmVudE5vZGU7XG5cbiAgICAgICAgaXNCb2R5ID0gZWwgPT09IGQuYm9keTtcbiAgICAgIH0gd2hpbGUgKGlzQm9keSA9PT0gZmFsc2UgJiYgaXNTY3JvbGxhYmxlKGVsKSA9PT0gZmFsc2UpO1xuXG4gICAgICBpc0JvZHkgPSBudWxsO1xuXG4gICAgICByZXR1cm4gZWw7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogc2VsZiBpbnZva2VkIGZ1bmN0aW9uIHRoYXQsIGdpdmVuIGEgY29udGV4dCwgc3RlcHMgdGhyb3VnaCBzY3JvbGxpbmdcbiAgICAgKiBAbWV0aG9kIHN0ZXBcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gY29udGV4dFxuICAgICAqIEByZXR1cm5zIHt1bmRlZmluZWR9XG4gICAgICovXG4gICAgZnVuY3Rpb24gc3RlcChjb250ZXh0KSB7XG4gICAgICB2YXIgdGltZSA9IG5vdygpO1xuICAgICAgdmFyIHZhbHVlO1xuICAgICAgdmFyIGN1cnJlbnRYO1xuICAgICAgdmFyIGN1cnJlbnRZO1xuICAgICAgdmFyIGVsYXBzZWQgPSAodGltZSAtIGNvbnRleHQuc3RhcnRUaW1lKSAvIFNDUk9MTF9USU1FO1xuXG4gICAgICAvLyBhdm9pZCBlbGFwc2VkIHRpbWVzIGhpZ2hlciB0aGFuIG9uZVxuICAgICAgZWxhcHNlZCA9IGVsYXBzZWQgPiAxID8gMSA6IGVsYXBzZWQ7XG5cbiAgICAgIC8vIGFwcGx5IGVhc2luZyB0byBlbGFwc2VkIHRpbWVcbiAgICAgIHZhbHVlID0gZWFzZShlbGFwc2VkKTtcblxuICAgICAgY3VycmVudFggPSBjb250ZXh0LnN0YXJ0WCArIChjb250ZXh0LnggLSBjb250ZXh0LnN0YXJ0WCkgKiB2YWx1ZTtcbiAgICAgIGN1cnJlbnRZID0gY29udGV4dC5zdGFydFkgKyAoY29udGV4dC55IC0gY29udGV4dC5zdGFydFkpICogdmFsdWU7XG5cbiAgICAgIGNvbnRleHQubWV0aG9kLmNhbGwoY29udGV4dC5zY3JvbGxhYmxlLCBjdXJyZW50WCwgY3VycmVudFkpO1xuXG4gICAgICAvLyBzY3JvbGwgbW9yZSBpZiB3ZSBoYXZlIG5vdCByZWFjaGVkIG91ciBkZXN0aW5hdGlvblxuICAgICAgaWYgKGN1cnJlbnRYICE9PSBjb250ZXh0LnggfHwgY3VycmVudFkgIT09IGNvbnRleHQueSkge1xuICAgICAgICB3LnJlcXVlc3RBbmltYXRpb25GcmFtZShzdGVwLmJpbmQodywgY29udGV4dCkpO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIHNjcm9sbHMgd2luZG93IG9yIGVsZW1lbnQgd2l0aCBhIHNtb290aCBiZWhhdmlvclxuICAgICAqIEBtZXRob2Qgc21vb3RoU2Nyb2xsXG4gICAgICogQHBhcmFtIHtPYmplY3R8Tm9kZX0gZWxcbiAgICAgKiBAcGFyYW0ge051bWJlcn0geFxuICAgICAqIEBwYXJhbSB7TnVtYmVyfSB5XG4gICAgICogQHJldHVybnMge3VuZGVmaW5lZH1cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBzbW9vdGhTY3JvbGwoZWwsIHgsIHkpIHtcbiAgICAgIHZhciBzY3JvbGxhYmxlO1xuICAgICAgdmFyIHN0YXJ0WDtcbiAgICAgIHZhciBzdGFydFk7XG4gICAgICB2YXIgbWV0aG9kO1xuICAgICAgdmFyIHN0YXJ0VGltZSA9IG5vdygpO1xuXG4gICAgICAvLyBkZWZpbmUgc2Nyb2xsIGNvbnRleHRcbiAgICAgIGlmIChlbCA9PT0gZC5ib2R5KSB7XG4gICAgICAgIHNjcm9sbGFibGUgPSB3O1xuICAgICAgICBzdGFydFggPSB3LnNjcm9sbFggfHwgdy5wYWdlWE9mZnNldDtcbiAgICAgICAgc3RhcnRZID0gdy5zY3JvbGxZIHx8IHcucGFnZVlPZmZzZXQ7XG4gICAgICAgIG1ldGhvZCA9IG9yaWdpbmFsLnNjcm9sbDtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHNjcm9sbGFibGUgPSBlbDtcbiAgICAgICAgc3RhcnRYID0gZWwuc2Nyb2xsTGVmdDtcbiAgICAgICAgc3RhcnRZID0gZWwuc2Nyb2xsVG9wO1xuICAgICAgICBtZXRob2QgPSBzY3JvbGxFbGVtZW50O1xuICAgICAgfVxuXG4gICAgICAvLyBzY3JvbGwgbG9vcGluZyBvdmVyIGEgZnJhbWVcbiAgICAgIHN0ZXAoe1xuICAgICAgICBzY3JvbGxhYmxlOiBzY3JvbGxhYmxlLFxuICAgICAgICBtZXRob2Q6IG1ldGhvZCxcbiAgICAgICAgc3RhcnRUaW1lOiBzdGFydFRpbWUsXG4gICAgICAgIHN0YXJ0WDogc3RhcnRYLFxuICAgICAgICBzdGFydFk6IHN0YXJ0WSxcbiAgICAgICAgeDogeCxcbiAgICAgICAgeTogeVxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgLy8gT1JJR0lOQUwgTUVUSE9EUyBPVkVSUklERVNcbiAgICAvLyB3LnNjcm9sbCBhbmQgdy5zY3JvbGxUb1xuICAgIHcuc2Nyb2xsID0gdy5zY3JvbGxUbyA9IGZ1bmN0aW9uKCkge1xuICAgICAgLy8gYXZvaWQgYWN0aW9uIHdoZW4gbm8gYXJndW1lbnRzIGFyZSBwYXNzZWRcbiAgICAgIGlmIChhcmd1bWVudHNbMF0gPT09IHVuZGVmaW5lZCkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIC8vIGF2b2lkIHNtb290aCBiZWhhdmlvciBpZiBub3QgcmVxdWlyZWRcbiAgICAgIGlmIChzaG91bGRCYWlsT3V0KGFyZ3VtZW50c1swXSkgPT09IHRydWUpIHtcbiAgICAgICAgb3JpZ2luYWwuc2Nyb2xsLmNhbGwoXG4gICAgICAgICAgdyxcbiAgICAgICAgICBhcmd1bWVudHNbMF0ubGVmdCAhPT0gdW5kZWZpbmVkXG4gICAgICAgICAgICA/IGFyZ3VtZW50c1swXS5sZWZ0XG4gICAgICAgICAgICA6IHR5cGVvZiBhcmd1bWVudHNbMF0gIT09ICdvYmplY3QnXG4gICAgICAgICAgICAgID8gYXJndW1lbnRzWzBdXG4gICAgICAgICAgICAgIDogdy5zY3JvbGxYIHx8IHcucGFnZVhPZmZzZXQsXG4gICAgICAgICAgLy8gdXNlIHRvcCBwcm9wLCBzZWNvbmQgYXJndW1lbnQgaWYgcHJlc2VudCBvciBmYWxsYmFjayB0byBzY3JvbGxZXG4gICAgICAgICAgYXJndW1lbnRzWzBdLnRvcCAhPT0gdW5kZWZpbmVkXG4gICAgICAgICAgICA/IGFyZ3VtZW50c1swXS50b3BcbiAgICAgICAgICAgIDogYXJndW1lbnRzWzFdICE9PSB1bmRlZmluZWRcbiAgICAgICAgICAgICAgPyBhcmd1bWVudHNbMV1cbiAgICAgICAgICAgICAgOiB3LnNjcm9sbFkgfHwgdy5wYWdlWU9mZnNldFxuICAgICAgICApO1xuXG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgLy8gTEVUIFRIRSBTTU9PVEhORVNTIEJFR0lOIVxuICAgICAgc21vb3RoU2Nyb2xsLmNhbGwoXG4gICAgICAgIHcsXG4gICAgICAgIGQuYm9keSxcbiAgICAgICAgYXJndW1lbnRzWzBdLmxlZnQgIT09IHVuZGVmaW5lZFxuICAgICAgICAgID8gfn5hcmd1bWVudHNbMF0ubGVmdFxuICAgICAgICAgIDogdy5zY3JvbGxYIHx8IHcucGFnZVhPZmZzZXQsXG4gICAgICAgIGFyZ3VtZW50c1swXS50b3AgIT09IHVuZGVmaW5lZFxuICAgICAgICAgID8gfn5hcmd1bWVudHNbMF0udG9wXG4gICAgICAgICAgOiB3LnNjcm9sbFkgfHwgdy5wYWdlWU9mZnNldFxuICAgICAgKTtcbiAgICB9O1xuXG4gICAgLy8gdy5zY3JvbGxCeVxuICAgIHcuc2Nyb2xsQnkgPSBmdW5jdGlvbigpIHtcbiAgICAgIC8vIGF2b2lkIGFjdGlvbiB3aGVuIG5vIGFyZ3VtZW50cyBhcmUgcGFzc2VkXG4gICAgICBpZiAoYXJndW1lbnRzWzBdID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICAvLyBhdm9pZCBzbW9vdGggYmVoYXZpb3IgaWYgbm90IHJlcXVpcmVkXG4gICAgICBpZiAoc2hvdWxkQmFpbE91dChhcmd1bWVudHNbMF0pKSB7XG4gICAgICAgIG9yaWdpbmFsLnNjcm9sbEJ5LmNhbGwoXG4gICAgICAgICAgdyxcbiAgICAgICAgICBhcmd1bWVudHNbMF0ubGVmdCAhPT0gdW5kZWZpbmVkXG4gICAgICAgICAgICA/IGFyZ3VtZW50c1swXS5sZWZ0XG4gICAgICAgICAgICA6IHR5cGVvZiBhcmd1bWVudHNbMF0gIT09ICdvYmplY3QnID8gYXJndW1lbnRzWzBdIDogMCxcbiAgICAgICAgICBhcmd1bWVudHNbMF0udG9wICE9PSB1bmRlZmluZWRcbiAgICAgICAgICAgID8gYXJndW1lbnRzWzBdLnRvcFxuICAgICAgICAgICAgOiBhcmd1bWVudHNbMV0gIT09IHVuZGVmaW5lZCA/IGFyZ3VtZW50c1sxXSA6IDBcbiAgICAgICAgKTtcblxuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIC8vIExFVCBUSEUgU01PT1RITkVTUyBCRUdJTiFcbiAgICAgIHNtb290aFNjcm9sbC5jYWxsKFxuICAgICAgICB3LFxuICAgICAgICBkLmJvZHksXG4gICAgICAgIH5+YXJndW1lbnRzWzBdLmxlZnQgKyAody5zY3JvbGxYIHx8IHcucGFnZVhPZmZzZXQpLFxuICAgICAgICB+fmFyZ3VtZW50c1swXS50b3AgKyAody5zY3JvbGxZIHx8IHcucGFnZVlPZmZzZXQpXG4gICAgICApO1xuICAgIH07XG5cbiAgICAvLyBFbGVtZW50LnByb3RvdHlwZS5zY3JvbGwgYW5kIEVsZW1lbnQucHJvdG90eXBlLnNjcm9sbFRvXG4gICAgRWxlbWVudC5wcm90b3R5cGUuc2Nyb2xsID0gRWxlbWVudC5wcm90b3R5cGUuc2Nyb2xsVG8gPSBmdW5jdGlvbigpIHtcbiAgICAgIC8vIGF2b2lkIGFjdGlvbiB3aGVuIG5vIGFyZ3VtZW50cyBhcmUgcGFzc2VkXG4gICAgICBpZiAoYXJndW1lbnRzWzBdID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICAvLyBhdm9pZCBzbW9vdGggYmVoYXZpb3IgaWYgbm90IHJlcXVpcmVkXG4gICAgICBpZiAoc2hvdWxkQmFpbE91dChhcmd1bWVudHNbMF0pID09PSB0cnVlKSB7XG4gICAgICAgIC8vIGlmIG9uZSBudW1iZXIgaXMgcGFzc2VkLCB0aHJvdyBlcnJvciB0byBtYXRjaCBGaXJlZm94IGltcGxlbWVudGF0aW9uXG4gICAgICAgIGlmICh0eXBlb2YgYXJndW1lbnRzWzBdID09PSAnbnVtYmVyJyAmJiBhcmd1bWVudHNbMV0gPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIHRocm93IG5ldyBTeW50YXhFcnJvcignVmFsdWUgY291bGQgbm90IGJlIGNvbnZlcnRlZCcpO1xuICAgICAgICB9XG5cbiAgICAgICAgb3JpZ2luYWwuZWxlbWVudFNjcm9sbC5jYWxsKFxuICAgICAgICAgIHRoaXMsXG4gICAgICAgICAgLy8gdXNlIGxlZnQgcHJvcCwgZmlyc3QgbnVtYmVyIGFyZ3VtZW50IG9yIGZhbGxiYWNrIHRvIHNjcm9sbExlZnRcbiAgICAgICAgICBhcmd1bWVudHNbMF0ubGVmdCAhPT0gdW5kZWZpbmVkXG4gICAgICAgICAgICA/IH5+YXJndW1lbnRzWzBdLmxlZnRcbiAgICAgICAgICAgIDogdHlwZW9mIGFyZ3VtZW50c1swXSAhPT0gJ29iamVjdCcgPyB+fmFyZ3VtZW50c1swXSA6IHRoaXMuc2Nyb2xsTGVmdCxcbiAgICAgICAgICAvLyB1c2UgdG9wIHByb3AsIHNlY29uZCBhcmd1bWVudCBvciBmYWxsYmFjayB0byBzY3JvbGxUb3BcbiAgICAgICAgICBhcmd1bWVudHNbMF0udG9wICE9PSB1bmRlZmluZWRcbiAgICAgICAgICAgID8gfn5hcmd1bWVudHNbMF0udG9wXG4gICAgICAgICAgICA6IGFyZ3VtZW50c1sxXSAhPT0gdW5kZWZpbmVkID8gfn5hcmd1bWVudHNbMV0gOiB0aGlzLnNjcm9sbFRvcFxuICAgICAgICApO1xuXG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgdmFyIGxlZnQgPSBhcmd1bWVudHNbMF0ubGVmdDtcbiAgICAgIHZhciB0b3AgPSBhcmd1bWVudHNbMF0udG9wO1xuXG4gICAgICAvLyBMRVQgVEhFIFNNT09USE5FU1MgQkVHSU4hXG4gICAgICBzbW9vdGhTY3JvbGwuY2FsbChcbiAgICAgICAgdGhpcyxcbiAgICAgICAgdGhpcyxcbiAgICAgICAgdHlwZW9mIGxlZnQgPT09ICd1bmRlZmluZWQnID8gdGhpcy5zY3JvbGxMZWZ0IDogfn5sZWZ0LFxuICAgICAgICB0eXBlb2YgdG9wID09PSAndW5kZWZpbmVkJyA/IHRoaXMuc2Nyb2xsVG9wIDogfn50b3BcbiAgICAgICk7XG4gICAgfTtcblxuICAgIC8vIEVsZW1lbnQucHJvdG90eXBlLnNjcm9sbEJ5XG4gICAgRWxlbWVudC5wcm90b3R5cGUuc2Nyb2xsQnkgPSBmdW5jdGlvbigpIHtcbiAgICAgIC8vIGF2b2lkIGFjdGlvbiB3aGVuIG5vIGFyZ3VtZW50cyBhcmUgcGFzc2VkXG4gICAgICBpZiAoYXJndW1lbnRzWzBdID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICAvLyBhdm9pZCBzbW9vdGggYmVoYXZpb3IgaWYgbm90IHJlcXVpcmVkXG4gICAgICBpZiAoc2hvdWxkQmFpbE91dChhcmd1bWVudHNbMF0pID09PSB0cnVlKSB7XG4gICAgICAgIG9yaWdpbmFsLmVsZW1lbnRTY3JvbGwuY2FsbChcbiAgICAgICAgICB0aGlzLFxuICAgICAgICAgIGFyZ3VtZW50c1swXS5sZWZ0ICE9PSB1bmRlZmluZWRcbiAgICAgICAgICAgID8gfn5hcmd1bWVudHNbMF0ubGVmdCArIHRoaXMuc2Nyb2xsTGVmdFxuICAgICAgICAgICAgOiB+fmFyZ3VtZW50c1swXSArIHRoaXMuc2Nyb2xsTGVmdCxcbiAgICAgICAgICBhcmd1bWVudHNbMF0udG9wICE9PSB1bmRlZmluZWRcbiAgICAgICAgICAgID8gfn5hcmd1bWVudHNbMF0udG9wICsgdGhpcy5zY3JvbGxUb3BcbiAgICAgICAgICAgIDogfn5hcmd1bWVudHNbMV0gKyB0aGlzLnNjcm9sbFRvcFxuICAgICAgICApO1xuXG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgdGhpcy5zY3JvbGwoe1xuICAgICAgICBsZWZ0OiB+fmFyZ3VtZW50c1swXS5sZWZ0ICsgdGhpcy5zY3JvbGxMZWZ0LFxuICAgICAgICB0b3A6IH5+YXJndW1lbnRzWzBdLnRvcCArIHRoaXMuc2Nyb2xsVG9wLFxuICAgICAgICBiZWhhdmlvcjogYXJndW1lbnRzWzBdLmJlaGF2aW9yXG4gICAgICB9KTtcbiAgICB9O1xuXG4gICAgLy8gRWxlbWVudC5wcm90b3R5cGUuc2Nyb2xsSW50b1ZpZXdcbiAgICBFbGVtZW50LnByb3RvdHlwZS5zY3JvbGxJbnRvVmlldyA9IGZ1bmN0aW9uKCkge1xuICAgICAgLy8gYXZvaWQgc21vb3RoIGJlaGF2aW9yIGlmIG5vdCByZXF1aXJlZFxuICAgICAgaWYgKHNob3VsZEJhaWxPdXQoYXJndW1lbnRzWzBdKSA9PT0gdHJ1ZSkge1xuICAgICAgICBvcmlnaW5hbC5zY3JvbGxJbnRvVmlldy5jYWxsKFxuICAgICAgICAgIHRoaXMsXG4gICAgICAgICAgYXJndW1lbnRzWzBdID09PSB1bmRlZmluZWQgPyB0cnVlIDogYXJndW1lbnRzWzBdXG4gICAgICAgICk7XG5cbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICAvLyBMRVQgVEhFIFNNT09USE5FU1MgQkVHSU4hXG4gICAgICB2YXIgc2Nyb2xsYWJsZVBhcmVudCA9IGZpbmRTY3JvbGxhYmxlUGFyZW50KHRoaXMpO1xuICAgICAgdmFyIHBhcmVudFJlY3RzID0gc2Nyb2xsYWJsZVBhcmVudC5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcbiAgICAgIHZhciBjbGllbnRSZWN0cyA9IHRoaXMuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG5cbiAgICAgIGlmIChzY3JvbGxhYmxlUGFyZW50ICE9PSBkLmJvZHkpIHtcbiAgICAgICAgLy8gcmV2ZWFsIGVsZW1lbnQgaW5zaWRlIHBhcmVudFxuICAgICAgICBzbW9vdGhTY3JvbGwuY2FsbChcbiAgICAgICAgICB0aGlzLFxuICAgICAgICAgIHNjcm9sbGFibGVQYXJlbnQsXG4gICAgICAgICAgc2Nyb2xsYWJsZVBhcmVudC5zY3JvbGxMZWZ0ICsgY2xpZW50UmVjdHMubGVmdCAtIHBhcmVudFJlY3RzLmxlZnQsXG4gICAgICAgICAgc2Nyb2xsYWJsZVBhcmVudC5zY3JvbGxUb3AgKyBjbGllbnRSZWN0cy50b3AgLSBwYXJlbnRSZWN0cy50b3BcbiAgICAgICAgKTtcblxuICAgICAgICAvLyByZXZlYWwgcGFyZW50IGluIHZpZXdwb3J0IHVubGVzcyBpcyBmaXhlZFxuICAgICAgICBpZiAody5nZXRDb21wdXRlZFN0eWxlKHNjcm9sbGFibGVQYXJlbnQpLnBvc2l0aW9uICE9PSAnZml4ZWQnKSB7XG4gICAgICAgICAgdy5zY3JvbGxCeSh7XG4gICAgICAgICAgICBsZWZ0OiBwYXJlbnRSZWN0cy5sZWZ0LFxuICAgICAgICAgICAgdG9wOiBwYXJlbnRSZWN0cy50b3AsXG4gICAgICAgICAgICBiZWhhdmlvcjogJ3Ntb290aCdcbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gcmV2ZWFsIGVsZW1lbnQgaW4gdmlld3BvcnRcbiAgICAgICAgdy5zY3JvbGxCeSh7XG4gICAgICAgICAgbGVmdDogY2xpZW50UmVjdHMubGVmdCxcbiAgICAgICAgICB0b3A6IGNsaWVudFJlY3RzLnRvcCxcbiAgICAgICAgICBiZWhhdmlvcjogJ3Ntb290aCdcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfTtcbiAgfVxuXG4gIGlmICh0eXBlb2YgZXhwb3J0cyA9PT0gJ29iamVjdCcgJiYgdHlwZW9mIG1vZHVsZSAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAvLyBjb21tb25qc1xuICAgIG1vZHVsZS5leHBvcnRzID0geyBwb2x5ZmlsbDogcG9seWZpbGwgfTtcbiAgfSBlbHNlIHtcbiAgICAvLyBnbG9iYWxcbiAgICBwb2x5ZmlsbCgpO1xuICB9XG5cbn0oKSk7XG4iLCJjb25zdCBhcnRpY2xlVGVtcGxhdGUgPSBgXG5cdDxhcnRpY2xlIGNsYXNzPVwiYXJ0aWNsZV9fb3V0ZXJcIj5cblx0XHQ8ZGl2IGNsYXNzPVwiYXJ0aWNsZV9faW5uZXJcIj5cblx0XHRcdDxkaXYgY2xhc3M9XCJhcnRpY2xlX19oZWFkaW5nXCI+XG5cdFx0XHRcdDxhIGNsYXNzPVwianMtZW50cnktdGl0bGVcIj48L2E+XG5cdFx0XHRcdDxoMiBjbGFzcz1cImFydGljbGUtaGVhZGluZ19fdGl0bGVcIj48L2gyPlxuXHRcdFx0XHQ8ZGl2IGNsYXNzPVwiYXJ0aWNsZS1oZWFkaW5nX19uYW1lXCI+XG5cdFx0XHRcdFx0PHNwYW4gY2xhc3M9XCJhcnRpY2xlLWhlYWRpbmdfX25hbWUtLWZpcnN0XCI+PC9zcGFuPlxuXHRcdFx0XHRcdDxhIGNsYXNzPVwianMtZW50cnktYXJ0aXN0XCI+PC9hPlxuXHRcdFx0XHRcdDxzcGFuIGNsYXNzPVwiYXJ0aWNsZS1oZWFkaW5nX19uYW1lLS1sYXN0XCI+PC9zcGFuPlxuXHRcdFx0XHQ8L2Rpdj5cblx0XHRcdDwvZGl2Plx0XG5cdFx0XHQ8ZGl2IGNsYXNzPVwiYXJ0aWNsZV9fc2xpZGVyLW91dGVyXCI+XG5cdFx0XHRcdDxkaXYgY2xhc3M9XCJhcnRpY2xlX19zbGlkZXItaW5uZXJcIj48L2Rpdj5cblx0XHRcdFx0PGRpdiBjbGFzcz1cImFydGljbGVfX3Njcm9sbC1jb250cm9sc1wiPlxuXHRcdFx0XHRcdDxzcGFuIGNsYXNzPVwiY29udHJvbHMgYXJyb3ctcHJldlwiPuKGkDwvc3Bhbj4gXG5cdFx0XHRcdFx0PHNwYW4gY2xhc3M9XCJjb250cm9scyBhcnJvdy1uZXh0XCI+4oaSPC9zcGFuPlxuXHRcdFx0XHQ8L2Rpdj5cblx0XHRcdFx0PHAgY2xhc3M9XCJqcy1hcnRpY2xlLWFuY2hvci10YXJnZXRcIj48L3A+XG5cdFx0PC9kaXY+XG5cdDwvYXJ0aWNsZT5cbmA7XG5cbmV4cG9ydCBkZWZhdWx0IGFydGljbGVUZW1wbGF0ZTsiLCJpbXBvcnQgc21vb3Roc2Nyb2xsIGZyb20gJ3Ntb290aHNjcm9sbC1wb2x5ZmlsbCc7XG5cbmltcG9ydCBuYXZMZyBmcm9tICcuL25hdi1sZyc7XG5pbXBvcnQgYXJ0aWNsZVRlbXBsYXRlIGZyb20gJy4vYXJ0aWNsZS10ZW1wbGF0ZSc7XG5pbXBvcnQgeyBkZWJvdW5jZSB9IGZyb20gJy4vdXRpbHMnO1xuXG5cbmNvbnN0IERCID0gJ2h0dHBzOi8vbmV4dXMtY2F0YWxvZy5maXJlYmFzZWlvLmNvbS9wb3N0cy5qc29uP2F1dGg9N2c3cHlLS3lrTjNONWV3ckltaE9hUzZ2d3JGc2M1Zktrcms4ZWp6Zic7XG5jb25zdCBhbHBoYWJldCA9IFsnYScsICdiJywgJ2MnLCAnZCcsICdlJywgJ2YnLCAnZycsICdoJywgJ2knLCAnaicsICdrJywgJ2wnLCAnbScsICduJywgJ28nLCAncCcsICdyJywgJ3MnLCAndCcsICd1JywgJ3YnLCAndycsICd5JywgJ3onXTtcblxuY29uc3QgJGxvYWRpbmcgPSBBcnJheS5mcm9tKGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoJy5sb2FkaW5nJykpO1xuY29uc3QgJG5hdiA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdqcy1uYXYnKTtcbmNvbnN0ICRwYXJhbGxheCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJy5wYXJhbGxheCcpO1xuY29uc3QgJGNvbnRlbnQgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcuY29udGVudCcpO1xuY29uc3QgJHRpdGxlID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2pzLXRpdGxlJyk7XG5jb25zdCAkYXJyb3cgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcuYXJyb3cnKTtcbmNvbnN0ICRtb2RhbCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJy5tb2RhbCcpO1xuY29uc3QgJGxpZ2h0Ym94ID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignLmxpZ2h0Ym94Jyk7XG5jb25zdCAkdmlldyA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJy5saWdodGJveC12aWV3Jyk7XG5cbmxldCBzb3J0S2V5ID0gMDsgLy8gMCA9IGFydGlzdCwgMSA9IHRpdGxlXG5sZXQgZW50cmllcyA9IHsgYnlBdXRob3I6IFtdLCBieVRpdGxlOiBbXSB9O1xubGV0IGN1cnJlbnRMZXR0ZXIgPSAnQSc7XG5cbmxldCBsaWdodGJveCA9IGZhbHNlO1xubGV0IHgyID0gZmFsc2U7XG5jb25zdCBhdHRhY2hJbWFnZUxpc3RlbmVycyA9ICgpID0+IHtcblx0Y29uc3QgJGltYWdlcyA9IEFycmF5LmZyb20oZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbCgnLmFydGljbGUtaW1hZ2UnKSk7XG5cblx0JGltYWdlcy5mb3JFYWNoKGltZyA9PiB7XG5cdFx0aW1nLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKGV2dCkgPT4ge1xuXHRcdFx0aWYgKCFsaWdodGJveCkge1xuXHRcdFx0XHRsZXQgc3JjID0gaW1nLnNyYztcblx0XHRcdFx0XG5cdFx0XHRcdCRsaWdodGJveC5jbGFzc0xpc3QuYWRkKCdzaG93LWltZycpO1xuXHRcdFx0XHQkdmlldy5zZXRBdHRyaWJ1dGUoJ3N0eWxlJywgYGJhY2tncm91bmQtaW1hZ2U6IHVybCgke3NyY30pYCk7XG5cdFx0XHRcdGxpZ2h0Ym94ID0gdHJ1ZTtcblx0XHRcdH1cblx0XHR9KTtcblx0fSk7XG5cblx0JHZpZXcuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoKSA9PiB7XG5cdFx0aWYgKGxpZ2h0Ym94KSB7XG5cdFx0XHQkbGlnaHRib3guY2xhc3NMaXN0LnJlbW92ZSgnc2hvdy1pbWcnKTtcblx0XHRcdGxpZ2h0Ym94ID0gZmFsc2U7XG5cdFx0fVxuXHR9KTtcbn07XG5cbmxldCBtb2RhbCA9IGZhbHNlO1xuY29uc3QgYXR0YWNoTW9kYWxMaXN0ZW5lcnMgPSAoKSA9PiB7XG5cdGNvbnN0ICRmaW5kID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2pzLWZpbmQnKTtcblx0XG5cdCRmaW5kLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKCkgPT4ge1xuXHRcdCRtb2RhbC5jbGFzc0xpc3QuYWRkKCdzaG93Jyk7XG5cdFx0bW9kYWwgPSB0cnVlO1xuXHR9KTtcblxuXHQkbW9kYWwuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoKSA9PiB7XG5cdFx0JG1vZGFsLmNsYXNzTGlzdC5yZW1vdmUoJ3Nob3cnKTtcblx0XHRtb2RhbCA9IGZhbHNlO1xuXHR9KTtcblxuXHR3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcigna2V5ZG93bicsICgpID0+IHtcblx0XHRpZiAobW9kYWwpIHtcblx0XHRcdHNldFRpbWVvdXQoKCkgPT4ge1xuXHRcdFx0XHQkbW9kYWwuY2xhc3NMaXN0LnJlbW92ZSgnc2hvdycpO1xuXHRcdFx0XHRtb2RhbCA9IGZhbHNlO1xuXHRcdFx0fSwgNjAwKTtcblx0XHR9O1xuXHR9KTtcbn1cblxuY29uc3Qgc2Nyb2xsVG9Ub3AgPSAoKSA9PiB7XG5cdGxldCB0aGluZyA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdhbmNob3ItdGFyZ2V0Jyk7XG5cdHRoaW5nLnNjcm9sbEludG9WaWV3KHtiZWhhdmlvcjogXCJzbW9vdGhcIiwgYmxvY2s6IFwic3RhcnRcIn0pO1xufVxuXG5sZXQgcHJldjtcbmxldCBjdXJyZW50ID0gMDtcbmxldCBpc1Nob3dpbmcgPSBmYWxzZTtcbmNvbnN0IGF0dGFjaEFycm93TGlzdGVuZXJzID0gKCkgPT4ge1xuXHQkYXJyb3cuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoKSA9PiB7XG5cdFx0c2Nyb2xsVG9Ub3AoKTtcblx0fSk7XG5cblx0JHBhcmFsbGF4LmFkZEV2ZW50TGlzdGVuZXIoJ3Njcm9sbCcsICgpID0+IHtcblxuXHRcdGxldCB5ID0gJHRpdGxlLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpLnk7XG5cdFx0aWYgKGN1cnJlbnQgIT09IHkpIHtcblx0XHRcdHByZXYgPSBjdXJyZW50O1xuXHRcdFx0Y3VycmVudCA9IHk7XG5cdFx0fVxuXG5cdFx0aWYgKHkgPD0gLTUwICYmICFpc1Nob3dpbmcpIHtcblx0XHRcdCRhcnJvdy5jbGFzc0xpc3QuYWRkKCdzaG93Jyk7XG5cdFx0XHRpc1Nob3dpbmcgPSB0cnVlO1xuXHRcdH0gZWxzZSBpZiAoeSA+IC01MCAmJiBpc1Nob3dpbmcpIHtcblx0XHRcdCRhcnJvdy5jbGFzc0xpc3QucmVtb3ZlKCdzaG93Jyk7XG5cdFx0XHRpc1Nob3dpbmcgPSBmYWxzZTtcblx0XHR9XG5cdH0pO1xufTtcblxuY29uc3QgYWRkU29ydEJ1dHRvbkxpc3RlbmVycyA9ICgpID0+IHtcblx0bGV0ICRieUFydGlzdCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdqcy1ieS1hcnRpc3QnKTtcblx0bGV0ICRieVRpdGxlID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2pzLWJ5LXRpdGxlJyk7XG5cdCRieUFydGlzdC5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsICgpID0+IHtcblx0XHRpZiAoc29ydEtleSkge1xuXHRcdFx0c2Nyb2xsVG9Ub3AoKTtcblx0XHRcdHNvcnRLZXkgPSAwO1xuXHRcdFx0JGJ5QXJ0aXN0LmNsYXNzTGlzdC5hZGQoJ2FjdGl2ZScpO1xuXHRcdFx0JGJ5VGl0bGUuY2xhc3NMaXN0LnJlbW92ZSgnYWN0aXZlJyk7XG5cblx0XHRcdHJlbmRlckVudHJpZXMoKTtcblx0XHR9XG5cdH0pO1xuXG5cdCRieVRpdGxlLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKCkgPT4ge1xuXHRcdGlmICghc29ydEtleSkge1xuXHRcdFx0c2Nyb2xsVG9Ub3AoKTtcblx0XHRcdHNvcnRLZXkgPSAxO1xuXHRcdFx0JGJ5VGl0bGUuY2xhc3NMaXN0LmFkZCgnYWN0aXZlJyk7XG5cdFx0XHQkYnlBcnRpc3QuY2xhc3NMaXN0LnJlbW92ZSgnYWN0aXZlJyk7XG5cblx0XHRcdHJlbmRlckVudHJpZXMoKTtcblx0XHR9XG5cdH0pO1xufTtcblxuY29uc3QgY2xlYXJBbmNob3JzID0gKHByZXZTZWxlY3RvcikgPT4ge1xuXHRsZXQgJGVudHJpZXMgPSBBcnJheS5mcm9tKGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwocHJldlNlbGVjdG9yKSk7XG5cdCRlbnRyaWVzLmZvckVhY2goZW50cnkgPT4gZW50cnkucmVtb3ZlQXR0cmlidXRlKCduYW1lJykpO1xufTtcblxuY29uc3QgZmluZEZpcnN0RW50cnkgPSAoY2hhcikgPT4ge1xuXHRsZXQgc2VsZWN0b3IgPSBzb3J0S2V5ID8gJy5qcy1lbnRyeS10aXRsZScgOiAnLmpzLWVudHJ5LWFydGlzdCc7XG5cdGxldCBwcmV2U2VsZWN0b3IgPSAhc29ydEtleSA/ICcuanMtZW50cnktdGl0bGUnIDogJy5qcy1lbnRyeS1hcnRpc3QnO1xuXHRsZXQgJGVudHJpZXMgPSBBcnJheS5mcm9tKGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoc2VsZWN0b3IpKTtcblxuXHRjbGVhckFuY2hvcnMocHJldlNlbGVjdG9yKTtcblxuXHRyZXR1cm4gJGVudHJpZXMuZmluZChlbnRyeSA9PiB7XG5cdFx0bGV0IG5vZGUgPSBlbnRyeS5uZXh0RWxlbWVudFNpYmxpbmc7XG5cdFx0cmV0dXJuIG5vZGUuaW5uZXJIVE1MWzBdID09PSBjaGFyIHx8IG5vZGUuaW5uZXJIVE1MWzBdID09PSBjaGFyLnRvVXBwZXJDYXNlKCk7XG5cdH0pO1xufTtcblxuXG5jb25zdCBtYWtlQWxwaGFiZXQgPSAoKSA9PiB7XG5cdGNvbnN0IGF0dGFjaEFuY2hvckxpc3RlbmVyID0gKCRhbmNob3IsIGxldHRlcikgPT4ge1xuXHRcdCRhbmNob3IuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoKSA9PiB7XG5cdFx0XHRjb25zdCBsZXR0ZXJOb2RlID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQobGV0dGVyKTtcblx0XHRcdGxldCB0YXJnZXQ7XG5cblx0XHRcdGlmICghc29ydEtleSkge1xuXHRcdFx0XHR0YXJnZXQgPSBsZXR0ZXIgPT09ICdhJyA/IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdhbmNob3ItdGFyZ2V0JykgOiBsZXR0ZXJOb2RlLnBhcmVudEVsZW1lbnQucGFyZW50RWxlbWVudC5wYXJlbnRFbGVtZW50LnBhcmVudEVsZW1lbnQucHJldmlvdXNFbGVtZW50U2libGluZy5xdWVyeVNlbGVjdG9yKCcuanMtYXJ0aWNsZS1hbmNob3ItdGFyZ2V0Jyk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHR0YXJnZXQgPSBsZXR0ZXIgPT09ICdhJyA/IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdhbmNob3ItdGFyZ2V0JykgOiBsZXR0ZXJOb2RlLnBhcmVudEVsZW1lbnQucGFyZW50RWxlbWVudC5wYXJlbnRFbGVtZW50LnByZXZpb3VzRWxlbWVudFNpYmxpbmcucXVlcnlTZWxlY3RvcignLmpzLWFydGljbGUtYW5jaG9yLXRhcmdldCcpO1xuXHRcdFx0fTtcblxuXHRcdFx0dGFyZ2V0LnNjcm9sbEludG9WaWV3KHtiZWhhdmlvcjogXCJzbW9vdGhcIiwgYmxvY2s6IFwic3RhcnRcIn0pO1xuXHRcdH0pO1xuXHR9O1xuXG5cdGxldCBhY3RpdmVFbnRyaWVzID0ge307XG5cdGxldCAkb3V0ZXIgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcuYWxwaGFiZXRfX2xldHRlcnMnKTtcblx0JG91dGVyLmlubmVySFRNTCA9ICcnO1xuXG5cdGFscGhhYmV0LmZvckVhY2gobGV0dGVyID0+IHtcblx0XHRsZXQgJGZpcnN0RW50cnkgPSBmaW5kRmlyc3RFbnRyeShsZXR0ZXIpO1xuXHRcdGxldCAkYW5jaG9yID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnYScpO1xuXG5cdFx0aWYgKCEkZmlyc3RFbnRyeSkgcmV0dXJuO1xuXG5cdFx0JGZpcnN0RW50cnkuaWQgPSBsZXR0ZXI7XG5cdFx0JGFuY2hvci5pbm5lckhUTUwgPSBsZXR0ZXIudG9VcHBlckNhc2UoKTtcblx0XHQkYW5jaG9yLmNsYXNzTmFtZSA9ICdhbHBoYWJldF9fbGV0dGVyLWFuY2hvcic7XG5cblx0XHRhdHRhY2hBbmNob3JMaXN0ZW5lcigkYW5jaG9yLCBsZXR0ZXIpO1xuXHRcdCRvdXRlci5hcHBlbmRDaGlsZCgkYW5jaG9yKTtcblx0fSk7XG59O1xuXG5jb25zdCByZW5kZXJJbWFnZXMgPSAoaW1hZ2VzLCAkaW1hZ2VzKSA9PiB7XG5cdGltYWdlcy5mb3JFYWNoKGltYWdlID0+IHtcblx0XHRjb25zdCBzcmMgPSBgLi4vLi4vYXNzZXRzL2ltYWdlcy8ke2ltYWdlfWA7XG5cdFx0Y29uc3QgJGltZ091dGVyID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG5cdFx0Y29uc3QgJGltZyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ0lNRycpO1xuXHRcdCRpbWcuY2xhc3NOYW1lID0gJ2FydGljbGUtaW1hZ2UnO1xuXHRcdCRpbWcuc3JjID0gc3JjO1xuXHRcdCRpbWdPdXRlci5hcHBlbmRDaGlsZCgkaW1nKTtcblx0XHQkaW1hZ2VzLmFwcGVuZENoaWxkKCRpbWdPdXRlcik7XG5cdH0pXG59O1xuXG5jb25zdCByZW5kZXJFbnRyaWVzID0gKCkgPT4ge1xuXHRjb25zdCAkYXJ0aWNsZUxpc3QgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnanMtbGlzdCcpO1xuXHRjb25zdCBlbnRyaWVzTGlzdCA9IHNvcnRLZXkgPyBlbnRyaWVzLmJ5VGl0bGUgOiBlbnRyaWVzLmJ5QXV0aG9yO1xuXG5cdCRhcnRpY2xlTGlzdC5pbm5lckhUTUwgPSAnJztcblxuXHRlbnRyaWVzTGlzdC5mb3JFYWNoKGVudHJ5ID0+IHtcblx0XHRjb25zdCB7IHRpdGxlLCBsYXN0TmFtZSwgZmlyc3ROYW1lLCBpbWFnZXMsIGRlc2NyaXB0aW9uLCBkZXRhaWwgfSA9IGVudHJ5O1xuXG5cdFx0JGFydGljbGVMaXN0Lmluc2VydEFkamFjZW50SFRNTCgnYmVmb3JlZW5kJywgYXJ0aWNsZVRlbXBsYXRlKTtcblxuXHRcdGNvbnN0ICRhbGxTbGlkZXJzID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbCgnLmFydGljbGVfX3NsaWRlci1pbm5lcicpO1xuXHRcdGNvbnN0ICRzbGlkZXIgPSAkYWxsU2xpZGVyc1skYWxsU2xpZGVycy5sZW5ndGggLSAxXTtcblx0XHQvLyBjb25zdCAkaW1hZ2VzID0gJHNsaWRlci5xdWVyeVNlbGVjdG9yKCcuYXJ0aWNsZV9faW1hZ2VzJyk7XG5cblx0XHRpZiAoaW1hZ2VzLmxlbmd0aCkgcmVuZGVySW1hZ2VzKGltYWdlcywgJHNsaWRlcik7XG5cdFx0XG5cdFx0Y29uc3QgJGRlc2NyaXB0aW9uT3V0ZXIgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcblx0XHRjb25zdCAkZGVzY3JpcHRpb25Ob2RlID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgncCcpO1xuXHRcdGNvbnN0ICRkZXRhaWxOb2RlID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgncCcpO1xuXHRcdCRkZXNjcmlwdGlvbk91dGVyLmNsYXNzTGlzdC5hZGQoJ2FydGljbGUtZGVzY3JpcHRpb25fX291dGVyJyk7XG5cdFx0JGRlc2NyaXB0aW9uTm9kZS5jbGFzc0xpc3QuYWRkKCdhcnRpY2xlLWRlc2NyaXB0aW9uJyk7XG5cdFx0JGRldGFpbE5vZGUuY2xhc3NMaXN0LmFkZCgnYXJ0aWNsZS1kZXRhaWwnKTtcblxuXHRcdCRkZXNjcmlwdGlvbk5vZGUuaW5uZXJIVE1MID0gZGVzY3JpcHRpb247XG5cdFx0JGRldGFpbE5vZGUuaW5uZXJIVE1MID0gZGV0YWlsO1xuXG5cdFx0JGRlc2NyaXB0aW9uT3V0ZXIuYXBwZW5kQ2hpbGQoJGRlc2NyaXB0aW9uTm9kZSwgJGRldGFpbE5vZGUpO1xuXHRcdCRzbGlkZXIuYXBwZW5kQ2hpbGQoJGRlc2NyaXB0aW9uT3V0ZXIpO1xuXG5cdFx0Y29uc3QgJHRpdGxlTm9kZXMgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKCcuYXJ0aWNsZS1oZWFkaW5nX190aXRsZScpO1xuXHRcdGNvbnN0ICR0aXRsZSA9ICR0aXRsZU5vZGVzWyR0aXRsZU5vZGVzLmxlbmd0aCAtIDFdO1xuXG5cdFx0Y29uc3QgJGZpcnN0Tm9kZXMgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKCcuYXJ0aWNsZS1oZWFkaW5nX19uYW1lLS1maXJzdCcpO1xuXHRcdGNvbnN0ICRmaXJzdCA9ICRmaXJzdE5vZGVzWyRmaXJzdE5vZGVzLmxlbmd0aCAtIDFdO1xuXG5cdFx0Y29uc3QgJGxhc3ROb2RlcyA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoJy5hcnRpY2xlLWhlYWRpbmdfX25hbWUtLWxhc3QnKTtcblx0XHRjb25zdCAkbGFzdCA9ICRsYXN0Tm9kZXNbJGxhc3ROb2Rlcy5sZW5ndGggLSAxXTtcblxuXHRcdCR0aXRsZS5pbm5lckhUTUwgPSB0aXRsZTtcblx0XHQkZmlyc3QuaW5uZXJIVE1MID0gZmlyc3ROYW1lO1xuXHRcdCRsYXN0LmlubmVySFRNTCA9IGxhc3ROYW1lO1xuXG5cdFx0Y29uc3QgJGFycm93TmV4dCA9ICRzbGlkZXIucGFyZW50RWxlbWVudC5xdWVyeVNlbGVjdG9yKCcuYXJyb3ctbmV4dCcpO1xuXHRcdGNvbnN0ICRhcnJvd1ByZXYgPSAkc2xpZGVyLnBhcmVudEVsZW1lbnQucXVlcnlTZWxlY3RvcignLmFycm93LXByZXYnKTtcblxuXHRcdGxldCBjdXJyZW50ID0gJHNsaWRlci5maXJzdEVsZW1lbnRDaGlsZDtcblx0XHQkYXJyb3dOZXh0LmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKCkgPT4ge1xuXHRcdFx0Y29uc3QgbmV4dCA9IGN1cnJlbnQubmV4dEVsZW1lbnRTaWJsaW5nO1xuXHRcdFx0aWYgKG5leHQpIHtcblx0XHRcdFx0bmV4dC5zY3JvbGxJbnRvVmlldyh7YmVoYXZpb3I6IFwic21vb3RoXCIsIGJsb2NrOiBcIm5lYXJlc3RcIiwgaW5saW5lOiBcImNlbnRlclwifSk7XG5cdFx0XHRcdGN1cnJlbnQgPSBuZXh0O1xuXHRcdFx0fVxuXHRcdH0pO1xuXG5cdFx0JGFycm93UHJldi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsICgpID0+IHtcblx0XHRcdGNvbnN0IHByZXYgPSBjdXJyZW50LnByZXZpb3VzRWxlbWVudFNpYmxpbmc7XG5cdFx0XHRpZiAocHJldikge1xuXHRcdFx0XHRwcmV2LnNjcm9sbEludG9WaWV3KHtiZWhhdmlvcjogXCJzbW9vdGhcIiwgYmxvY2s6IFwibmVhcmVzdFwiLCBpbmxpbmU6IFwiY2VudGVyXCJ9KTtcblx0XHRcdFx0Y3VycmVudCA9IHByZXY7XG5cdFx0XHR9XG5cdFx0fSlcblx0fSk7XG5cblx0YXR0YWNoSW1hZ2VMaXN0ZW5lcnMoKTtcblx0bWFrZUFscGhhYmV0KCk7XG59O1xuXG4vLyB0aGlzIG5lZWRzIHRvIGJlIGEgZGVlcGVyIHNvcnRcbmNvbnN0IHNvcnRCeVRpdGxlID0gKCkgPT4ge1xuXHRlbnRyaWVzLmJ5VGl0bGUuc29ydCgoYSwgYikgPT4ge1xuXHRcdGxldCBhVGl0bGUgPSBhLnRpdGxlWzBdLnRvVXBwZXJDYXNlKCk7XG5cdFx0bGV0IGJUaXRsZSA9IGIudGl0bGVbMF0udG9VcHBlckNhc2UoKTtcblx0XHRpZiAoYVRpdGxlID4gYlRpdGxlKSByZXR1cm4gMTtcblx0XHRlbHNlIGlmIChhVGl0bGUgPCBiVGl0bGUpIHJldHVybiAtMTtcblx0XHRlbHNlIHJldHVybiAwO1xuXHR9KTtcbn07XG5cbmNvbnN0IHNldERhdGEgPSAoZGF0YSkgPT4ge1xuXHRlbnRyaWVzLmJ5QXV0aG9yID0gZGF0YTtcblx0ZW50cmllcy5ieVRpdGxlID0gZGF0YS5zbGljZSgpOyAvLyBjb3BpZXMgZGF0YSBmb3IgYnlUaXRsZSBzb3J0XG5cdHNvcnRCeVRpdGxlKCk7XG5cdHJlbmRlckVudHJpZXMoKTtcbn1cblxuY29uc3QgZmV0Y2hEYXRhID0gKCkgPT4ge1xuXHRcdGZldGNoKERCKS50aGVuKHJlcyA9PlxuXHRcdFx0cmVzLmpzb24oKVxuXHRcdCkudGhlbihkYXRhID0+IHtcblx0XHRcdHNldERhdGEoZGF0YSk7XG5cdFx0fSlcblx0XHQudGhlbigoKSA9PiB7XG5cdFx0XHQkbG9hZGluZy5mb3JFYWNoKGVsZW0gPT4gZWxlbS5jbGFzc0xpc3QuYWRkKCdyZWFkeScpKTtcblx0XHRcdCRuYXYuY2xhc3NMaXN0LmFkZCgncmVhZHknKTtcblx0XHR9KVxuXHRcdC5jYXRjaChlcnIgPT4gY29uc29sZS53YXJuKGVycikpO1xufTtcblxuY29uc3QgaW5pdCA9ICgpID0+IHtcblx0c21vb3Roc2Nyb2xsLnBvbHlmaWxsKCk7XG5cdGZldGNoRGF0YSgpO1xuXHRuYXZMZygpO1xuXHRyZW5kZXJFbnRyaWVzKCk7XG5cdGFkZFNvcnRCdXR0b25MaXN0ZW5lcnMoKTtcblx0YXR0YWNoQXJyb3dMaXN0ZW5lcnMoKTtcblx0YXR0YWNoTW9kYWxMaXN0ZW5lcnMoKTtcbn1cblxuaW5pdCgpO1xuIiwiY29uc3QgdGVtcGxhdGUgPSBcblx0YDxkaXYgY2xhc3M9XCJuYXZfX2lubmVyXCI+XG5cdFx0PGRpdiBjbGFzcz1cIm5hdl9fc29ydC1ieVwiPlxuXHRcdFx0PHNwYW4gY2xhc3M9XCJzb3J0LWJ5X190aXRsZVwiPlNvcnQgYnk8L3NwYW4+XG5cdFx0XHQ8YnV0dG9uIGNsYXNzPVwic29ydC1ieSBzb3J0LWJ5X19ieS1hcnRpc3QgYWN0aXZlXCIgaWQ9XCJqcy1ieS1hcnRpc3RcIj5BcnRpc3Q8L2J1dHRvbj5cblx0XHRcdDxzcGFuIGNsYXNzPVwic29ydC1ieV9fZGl2aWRlclwiPiB8IDwvc3Bhbj5cblx0XHRcdDxidXR0b24gY2xhc3M9XCJzb3J0LWJ5IHNvcnQtYnlfX2J5LXRpdGxlXCIgaWQ9XCJqcy1ieS10aXRsZVwiPlRpdGxlPC9idXR0b24+XG5cdFx0XHQ8c3BhbiBjbGFzcz1cImZpbmRcIiBpZD1cImpzLWZpbmRcIj5cblx0XHRcdFx0KDxzcGFuIGNsYXNzPVwiZmluZC0taW5uZXJcIj4mIzg5ODQ7Rjwvc3Bhbj4pXG5cdFx0XHQ8L3NwYW4+XG5cdFx0PC9kaXY+XG5cdFx0PGRpdiBjbGFzcz1cIm5hdl9fYWxwaGFiZXRcIj5cblx0XHRcdDxzcGFuIGNsYXNzPVwiYWxwaGFiZXRfX3RpdGxlXCI+R28gdG88L3NwYW4+XG5cdFx0XHQ8ZGl2IGNsYXNzPVwiYWxwaGFiZXRfX2xldHRlcnNcIj48L2Rpdj5cblx0XHQ8L2Rpdj5cblx0PC9kaXY+YDtcblxuY29uc3QgbmF2TGcgPSAoKSA9PiB7XG5cdGxldCBuYXZPdXRlciA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdqcy1uYXYnKTtcblx0bmF2T3V0ZXIuaW5uZXJIVE1MID0gdGVtcGxhdGU7XG59O1xuXG5leHBvcnQgZGVmYXVsdCBuYXZMZzsiLCJjb25zdCBkZWJvdW5jZSA9IChmbiwgdGltZSkgPT4ge1xuICBsZXQgdGltZW91dDtcblxuICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgY29uc3QgZnVuY3Rpb25DYWxsID0gKCkgPT4gZm4uYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICBcbiAgICBjbGVhclRpbWVvdXQodGltZW91dCk7XG4gICAgdGltZW91dCA9IHNldFRpbWVvdXQoZnVuY3Rpb25DYWxsLCB0aW1lKTtcbiAgfVxufTtcblxuZXhwb3J0IHsgZGVib3VuY2UgfTsiXSwicHJlRXhpc3RpbmdDb21tZW50IjoiLy8jIHNvdXJjZU1hcHBpbmdVUkw9ZGF0YTphcHBsaWNhdGlvbi9qc29uO2NoYXJzZXQ9dXRmLTg7YmFzZTY0LGV5SjJaWEp6YVc5dUlqb3pMQ0p6YjNWeVkyVnpJanBiSW01dlpHVmZiVzlrZFd4bGN5OWljbTkzYzJWeUxYQmhZMnN2WDNCeVpXeDFaR1V1YW5NaUxDSnViMlJsWDIxdlpIVnNaWE12YzIxdmIzUm9jMk55YjJ4c0xYQnZiSGxtYVd4c0wyUnBjM1F2YzIxdmIzUm9jMk55YjJ4c0xtcHpJaXdpYzNKakwycHpMMkZ5ZEdsamJHVXRkR1Z0Y0d4aGRHVXVhbk1pTENKemNtTXZhbk12YVc1a1pYZ3Vhbk1pTENKemNtTXZhbk12Ym1GMkxXeG5MbXB6SWl3aWMzSmpMMnB6TDNWMGFXeHpMMmx1WkdWNExtcHpJbDBzSW01aGJXVnpJanBiWFN3aWJXRndjR2x1WjNNaU9pSkJRVUZCTzBGRFFVRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUczdPenM3T3p0QlEzWmlRU3hKUVVGTkxEZ3dRa0ZCVGpzN2EwSkJkVUpsTEdVN096czdPMEZEZGtKbU96czdPMEZCUlVFN096czdRVUZEUVRzN096dEJRVU5CT3pzN08wRkJSMEVzU1VGQlRTeExRVUZMTEN0R1FVRllPMEZCUTBFc1NVRkJUU3hYUVVGWExFTkJRVU1zUjBGQlJDeEZRVUZOTEVkQlFVNHNSVUZCVnl4SFFVRllMRVZCUVdkQ0xFZEJRV2hDTEVWQlFYRkNMRWRCUVhKQ0xFVkJRVEJDTEVkQlFURkNMRVZCUVN0Q0xFZEJRUzlDTEVWQlFXOURMRWRCUVhCRExFVkJRWGxETEVkQlFYcERMRVZCUVRoRExFZEJRVGxETEVWQlFXMUVMRWRCUVc1RUxFVkJRWGRFTEVkQlFYaEVMRVZCUVRaRUxFZEJRVGRFTEVWQlFXdEZMRWRCUVd4RkxFVkJRWFZGTEVkQlFYWkZMRVZCUVRSRkxFZEJRVFZGTEVWQlFXbEdMRWRCUVdwR0xFVkJRWE5HTEVkQlFYUkdMRVZCUVRKR0xFZEJRVE5HTEVWQlFXZEhMRWRCUVdoSExFVkJRWEZITEVkQlFYSkhMRVZCUVRCSExFZEJRVEZITEVWQlFTdEhMRWRCUVM5SExFVkJRVzlJTEVkQlFYQklMRU5CUVdwQ096dEJRVVZCTEVsQlFVMHNWMEZCVnl4TlFVRk5MRWxCUVU0c1EwRkJWeXhUUVVGVExHZENRVUZVTEVOQlFUQkNMRlZCUVRGQ0xFTkJRVmdzUTBGQmFrSTdRVUZEUVN4SlFVRk5MRTlCUVU4c1UwRkJVeXhqUVVGVUxFTkJRWGRDTEZGQlFYaENMRU5CUVdJN1FVRkRRU3hKUVVGTkxGbEJRVmtzVTBGQlV5eGhRVUZVTEVOQlFYVkNMRmRCUVhaQ0xFTkJRV3hDTzBGQlEwRXNTVUZCVFN4WFFVRlhMRk5CUVZNc1lVRkJWQ3hEUVVGMVFpeFZRVUYyUWl4RFFVRnFRanRCUVVOQkxFbEJRVTBzVTBGQlV5eFRRVUZUTEdOQlFWUXNRMEZCZDBJc1ZVRkJlRUlzUTBGQlpqdEJRVU5CTEVsQlFVMHNVMEZCVXl4VFFVRlRMR0ZCUVZRc1EwRkJkVUlzVVVGQmRrSXNRMEZCWmp0QlFVTkJMRWxCUVUwc1UwRkJVeXhUUVVGVExHRkJRVlFzUTBGQmRVSXNVVUZCZGtJc1EwRkJaanRCUVVOQkxFbEJRVTBzV1VGQldTeFRRVUZUTEdGQlFWUXNRMEZCZFVJc1YwRkJka0lzUTBGQmJFSTdRVUZEUVN4SlFVRk5MRkZCUVZFc1UwRkJVeXhoUVVGVUxFTkJRWFZDTEdkQ1FVRjJRaXhEUVVGa096dEJRVVZCTEVsQlFVa3NWVUZCVlN4RFFVRmtMRU1zUTBGQmFVSTdRVUZEYWtJc1NVRkJTU3hWUVVGVkxFVkJRVVVzVlVGQlZTeEZRVUZhTEVWQlFXZENMRk5CUVZNc1JVRkJla0lzUlVGQlpEdEJRVU5CTEVsQlFVa3NaMEpCUVdkQ0xFZEJRWEJDT3p0QlFVVkJMRWxCUVVrc1YwRkJWeXhMUVVGbU8wRkJRMEVzU1VGQlNTeExRVUZMTEV0QlFWUTdRVUZEUVN4SlFVRk5MSFZDUVVGMVFpeFRRVUYyUWl4dlFrRkJkVUlzUjBGQlRUdEJRVU5zUXl4TFFVRk5MRlZCUVZVc1RVRkJUU3hKUVVGT0xFTkJRVmNzVTBGQlV5eG5Ra0ZCVkN4RFFVRXdRaXhuUWtGQk1VSXNRMEZCV0N4RFFVRm9RanM3UVVGRlFTeFRRVUZSTEU5QlFWSXNRMEZCWjBJc1pVRkJUenRCUVVOMFFpeE5RVUZKTEdkQ1FVRktMRU5CUVhGQ0xFOUJRWEpDTEVWQlFUaENMRlZCUVVNc1IwRkJSQ3hGUVVGVE8wRkJRM1JETEU5QlFVa3NRMEZCUXl4UlFVRk1MRVZCUVdVN1FVRkRaQ3hSUVVGSkxFMUJRVTBzU1VGQlNTeEhRVUZrT3p0QlFVVkJMR05CUVZVc1UwRkJWaXhEUVVGdlFpeEhRVUZ3UWl4RFFVRjNRaXhWUVVGNFFqdEJRVU5CTEZWQlFVMHNXVUZCVGl4RFFVRnRRaXhQUVVGdVFpdzJRa0ZCY1VRc1IwRkJja1E3UVVGRFFTeGxRVUZYTEVsQlFWZzdRVUZEUVR0QlFVTkVMRWRCVWtRN1FVRlRRU3hGUVZaRU96dEJRVmxCTEU5QlFVMHNaMEpCUVU0c1EwRkJkVUlzVDBGQmRrSXNSVUZCWjBNc1dVRkJUVHRCUVVOeVF5eE5RVUZKTEZGQlFVb3NSVUZCWXp0QlFVTmlMR0ZCUVZVc1UwRkJWaXhEUVVGdlFpeE5RVUZ3UWl4RFFVRXlRaXhWUVVFelFqdEJRVU5CTEdOQlFWY3NTMEZCV0R0QlFVTkJPMEZCUTBRc1JVRk1SRHRCUVUxQkxFTkJja0pFT3p0QlFYVkNRU3hKUVVGSkxGRkJRVkVzUzBGQldqdEJRVU5CTEVsQlFVMHNkVUpCUVhWQ0xGTkJRWFpDTEc5Q1FVRjFRaXhIUVVGTk8wRkJRMnhETEV0QlFVMHNVVUZCVVN4VFFVRlRMR05CUVZRc1EwRkJkMElzVTBGQmVFSXNRMEZCWkRzN1FVRkZRU3hQUVVGTkxHZENRVUZPTEVOQlFYVkNMRTlCUVhaQ0xFVkJRV2RETEZsQlFVMDdRVUZEY2tNc1UwRkJUeXhUUVVGUUxFTkJRV2xDTEVkQlFXcENMRU5CUVhGQ0xFMUJRWEpDTzBGQlEwRXNWVUZCVVN4SlFVRlNPMEZCUTBFc1JVRklSRHM3UVVGTFFTeFJRVUZQTEdkQ1FVRlFMRU5CUVhkQ0xFOUJRWGhDTEVWQlFXbERMRmxCUVUwN1FVRkRkRU1zVTBGQlR5eFRRVUZRTEVOQlFXbENMRTFCUVdwQ0xFTkJRWGRDTEUxQlFYaENPMEZCUTBFc1ZVRkJVU3hMUVVGU08wRkJRMEVzUlVGSVJEczdRVUZMUVN4UlFVRlBMR2RDUVVGUUxFTkJRWGRDTEZOQlFYaENMRVZCUVcxRExGbEJRVTA3UVVGRGVFTXNUVUZCU1N4TFFVRktMRVZCUVZjN1FVRkRWaXhqUVVGWExGbEJRVTA3UVVGRGFFSXNWMEZCVHl4VFFVRlFMRU5CUVdsQ0xFMUJRV3BDTEVOQlFYZENMRTFCUVhoQ08wRkJRMEVzV1VGQlVTeExRVUZTTzBGQlEwRXNTVUZJUkN4RlFVZEhMRWRCU0VnN1FVRkpRVHRCUVVORUxFVkJVRVE3UVVGUlFTeERRWEpDUkRzN1FVRjFRa0VzU1VGQlRTeGpRVUZqTEZOQlFXUXNWMEZCWXl4SFFVRk5PMEZCUTNwQ0xFdEJRVWtzVVVGQlVTeFRRVUZUTEdOQlFWUXNRMEZCZDBJc1pVRkJlRUlzUTBGQldqdEJRVU5CTEU5QlFVMHNZMEZCVGl4RFFVRnhRaXhGUVVGRExGVkJRVlVzVVVGQldDeEZRVUZ4UWl4UFFVRlBMRTlCUVRWQ0xFVkJRWEpDTzBGQlEwRXNRMEZJUkRzN1FVRkxRU3hKUVVGSkxHRkJRVW83UVVGRFFTeEpRVUZKTEZWQlFWVXNRMEZCWkR0QlFVTkJMRWxCUVVrc1dVRkJXU3hMUVVGb1FqdEJRVU5CTEVsQlFVMHNkVUpCUVhWQ0xGTkJRWFpDTEc5Q1FVRjFRaXhIUVVGTk8wRkJRMnhETEZGQlFVOHNaMEpCUVZBc1EwRkJkMElzVDBGQmVFSXNSVUZCYVVNc1dVRkJUVHRCUVVOMFF6dEJRVU5CTEVWQlJrUTdPMEZCU1VFc1YwRkJWU3huUWtGQlZpeERRVUV5UWl4UlFVRXpRaXhGUVVGeFF5eFpRVUZOT3p0QlFVVXhReXhOUVVGSkxFbEJRVWtzVDBGQlR5eHhRa0ZCVUN4SFFVRXJRaXhEUVVGMlF6dEJRVU5CTEUxQlFVa3NXVUZCV1N4RFFVRm9RaXhGUVVGdFFqdEJRVU5zUWl4VlFVRlBMRTlCUVZBN1FVRkRRU3hoUVVGVkxFTkJRVlk3UVVGRFFUczdRVUZGUkN4TlFVRkpMRXRCUVVzc1EwRkJReXhGUVVGT0xFbEJRVmtzUTBGQlF5eFRRVUZxUWl4RlFVRTBRanRCUVVNelFpeFZRVUZQTEZOQlFWQXNRMEZCYVVJc1IwRkJha0lzUTBGQmNVSXNUVUZCY2tJN1FVRkRRU3hsUVVGWkxFbEJRVm83UVVGRFFTeEhRVWhFTEUxQlIwOHNTVUZCU1N4SlFVRkpMRU5CUVVNc1JVRkJUQ3hKUVVGWExGTkJRV1lzUlVGQk1FSTdRVUZEYUVNc1ZVRkJUeXhUUVVGUUxFTkJRV2xDTEUxQlFXcENMRU5CUVhkQ0xFMUJRWGhDTzBGQlEwRXNaVUZCV1N4TFFVRmFPMEZCUTBFN1FVRkRSQ3hGUVdaRU8wRkJaMEpCTEVOQmNrSkVPenRCUVhWQ1FTeEpRVUZOTEhsQ1FVRjVRaXhUUVVGNlFpeHpRa0ZCZVVJc1IwRkJUVHRCUVVOd1F5eExRVUZKTEZsQlFWa3NVMEZCVXl4alFVRlVMRU5CUVhkQ0xHTkJRWGhDTEVOQlFXaENPMEZCUTBFc1MwRkJTU3hYUVVGWExGTkJRVk1zWTBGQlZDeERRVUYzUWl4aFFVRjRRaXhEUVVGbU8wRkJRMEVzVjBGQlZTeG5Ra0ZCVml4RFFVRXlRaXhQUVVFelFpeEZRVUZ2UXl4WlFVRk5PMEZCUTNwRExFMUJRVWtzVDBGQlNpeEZRVUZoTzBGQlExbzdRVUZEUVN4aFFVRlZMRU5CUVZZN1FVRkRRU3hoUVVGVkxGTkJRVllzUTBGQmIwSXNSMEZCY0VJc1EwRkJkMElzVVVGQmVFSTdRVUZEUVN4WlFVRlRMRk5CUVZRc1EwRkJiVUlzVFVGQmJrSXNRMEZCTUVJc1VVRkJNVUk3TzBGQlJVRTdRVUZEUVR0QlFVTkVMRVZCVkVRN08wRkJWMEVzVlVGQlV5eG5Ra0ZCVkN4RFFVRXdRaXhQUVVFeFFpeEZRVUZ0UXl4WlFVRk5PMEZCUTNoRExFMUJRVWtzUTBGQlF5eFBRVUZNTEVWQlFXTTdRVUZEWWp0QlFVTkJMR0ZCUVZVc1EwRkJWanRCUVVOQkxGbEJRVk1zVTBGQlZDeERRVUZ0UWl4SFFVRnVRaXhEUVVGMVFpeFJRVUYyUWp0QlFVTkJMR0ZCUVZVc1UwRkJWaXhEUVVGdlFpeE5RVUZ3UWl4RFFVRXlRaXhSUVVFelFqczdRVUZGUVR0QlFVTkJPMEZCUTBRc1JVRlVSRHRCUVZWQkxFTkJlRUpFT3p0QlFUQkNRU3hKUVVGTkxHVkJRV1VzVTBGQlppeFpRVUZsTEVOQlFVTXNXVUZCUkN4RlFVRnJRanRCUVVOMFF5eExRVUZKTEZkQlFWY3NUVUZCVFN4SlFVRk9MRU5CUVZjc1UwRkJVeXhuUWtGQlZDeERRVUV3UWl4WlFVRXhRaXhEUVVGWUxFTkJRV1k3UVVGRFFTeFZRVUZUTEU5QlFWUXNRMEZCYVVJN1FVRkJRU3hUUVVGVExFMUJRVTBzWlVGQlRpeERRVUZ6UWl4TlFVRjBRaXhEUVVGVU8wRkJRVUVzUlVGQmFrSTdRVUZEUVN4RFFVaEVPenRCUVV0QkxFbEJRVTBzYVVKQlFXbENMRk5CUVdwQ0xHTkJRV2xDTEVOQlFVTXNTVUZCUkN4RlFVRlZPMEZCUTJoRExFdEJRVWtzVjBGQlZ5eFZRVUZWTEdsQ1FVRldMRWRCUVRoQ0xHdENRVUUzUXp0QlFVTkJMRXRCUVVrc1pVRkJaU3hEUVVGRExFOUJRVVFzUjBGQlZ5eHBRa0ZCV0N4SFFVRXJRaXhyUWtGQmJFUTdRVUZEUVN4TFFVRkpMRmRCUVZjc1RVRkJUU3hKUVVGT0xFTkJRVmNzVTBGQlV5eG5Ra0ZCVkN4RFFVRXdRaXhSUVVFeFFpeERRVUZZTEVOQlFXWTdPMEZCUlVFc1kwRkJZU3haUVVGaU96dEJRVVZCTEZGQlFVOHNVMEZCVXl4SlFVRlVMRU5CUVdNc2FVSkJRVk03UVVGRE4wSXNUVUZCU1N4UFFVRlBMRTFCUVUwc2EwSkJRV3BDTzBGQlEwRXNVMEZCVHl4TFFVRkxMRk5CUVV3c1EwRkJaU3hEUVVGbUxFMUJRWE5DTEVsQlFYUkNMRWxCUVRoQ0xFdEJRVXNzVTBGQlRDeERRVUZsTEVOQlFXWXNUVUZCYzBJc1MwRkJTeXhYUVVGTUxFVkJRVE5FTzBGQlEwRXNSVUZJVFN4RFFVRlFPMEZCU1VFc1EwRllSRHM3UVVGalFTeEpRVUZOTEdWQlFXVXNVMEZCWml4WlFVRmxMRWRCUVUwN1FVRkRNVUlzUzBGQlRTeDFRa0ZCZFVJc1UwRkJka0lzYjBKQlFYVkNMRU5CUVVNc1QwRkJSQ3hGUVVGVkxFMUJRVllzUlVGQmNVSTdRVUZEYWtRc1ZVRkJVU3huUWtGQlVpeERRVUY1UWl4UFFVRjZRaXhGUVVGclF5eFpRVUZOTzBGQlEzWkRMRTlCUVUwc1lVRkJZU3hUUVVGVExHTkJRVlFzUTBGQmQwSXNUVUZCZUVJc1EwRkJia0k3UVVGRFFTeFBRVUZKTEdWQlFVbzdPMEZCUlVFc1QwRkJTU3hEUVVGRExFOUJRVXdzUlVGQll6dEJRVU5pTEdGQlFWTXNWMEZCVnl4SFFVRllMRWRCUVdsQ0xGTkJRVk1zWTBGQlZDeERRVUYzUWl4bFFVRjRRaXhEUVVGcVFpeEhRVUUwUkN4WFFVRlhMR0ZCUVZnc1EwRkJlVUlzWVVGQmVrSXNRMEZCZFVNc1lVRkJka01zUTBGQmNVUXNZVUZCY2tRc1EwRkJiVVVzYzBKQlFXNUZMRU5CUVRCR0xHRkJRVEZHTEVOQlFYZEhMREpDUVVGNFJ5eERRVUZ5UlR0QlFVTkJMRWxCUmtRc1RVRkZUenRCUVVOT0xHRkJRVk1zVjBGQlZ5eEhRVUZZTEVkQlFXbENMRk5CUVZNc1kwRkJWQ3hEUVVGM1FpeGxRVUY0UWl4RFFVRnFRaXhIUVVFMFJDeFhRVUZYTEdGQlFWZ3NRMEZCZVVJc1lVRkJla0lzUTBGQmRVTXNZVUZCZGtNc1EwRkJjVVFzYzBKQlFYSkVMRU5CUVRSRkxHRkJRVFZGTEVOQlFUQkdMREpDUVVFeFJpeERRVUZ5UlR0QlFVTkJPenRCUVVWRUxGVkJRVThzWTBGQlVDeERRVUZ6UWl4RlFVRkRMRlZCUVZVc1VVRkJXQ3hGUVVGeFFpeFBRVUZQTEU5QlFUVkNMRVZCUVhSQ08wRkJRMEVzUjBGWVJEdEJRVmxCTEVWQllrUTdPMEZCWlVFc1MwRkJTU3huUWtGQlowSXNSVUZCY0VJN1FVRkRRU3hMUVVGSkxGTkJRVk1zVTBGQlV5eGhRVUZVTEVOQlFYVkNMRzlDUVVGMlFpeERRVUZpTzBGQlEwRXNVVUZCVHl4VFFVRlFMRWRCUVcxQ0xFVkJRVzVDT3p0QlFVVkJMRlZCUVZNc1QwRkJWQ3hEUVVGcFFpeHJRa0ZCVlR0QlFVTXhRaXhOUVVGSkxHTkJRV01zWlVGQlpTeE5RVUZtTEVOQlFXeENPMEZCUTBFc1RVRkJTU3hWUVVGVkxGTkJRVk1zWVVGQlZDeERRVUYxUWl4SFFVRjJRaXhEUVVGa096dEJRVVZCTEUxQlFVa3NRMEZCUXl4WFFVRk1MRVZCUVd0Q096dEJRVVZzUWl4alFVRlpMRVZCUVZvc1IwRkJhVUlzVFVGQmFrSTdRVUZEUVN4VlFVRlJMRk5CUVZJc1IwRkJiMElzVDBGQlR5eFhRVUZRTEVWQlFYQkNPMEZCUTBFc1ZVRkJVU3hUUVVGU0xFZEJRVzlDTEhsQ1FVRndRanM3UVVGRlFTeDFRa0ZCY1VJc1QwRkJja0lzUlVGQk9FSXNUVUZCT1VJN1FVRkRRU3hUUVVGUExGZEJRVkFzUTBGQmJVSXNUMEZCYmtJN1FVRkRRU3hGUVZwRU8wRkJZVUVzUTBGcVEwUTdPMEZCYlVOQkxFbEJRVTBzWlVGQlpTeFRRVUZtTEZsQlFXVXNRMEZCUXl4TlFVRkVMRVZCUVZNc1QwRkJWQ3hGUVVGeFFqdEJRVU42UXl4UlFVRlBMRTlCUVZBc1EwRkJaU3hwUWtGQlV6dEJRVU4yUWl4TlFVRk5MQ3RDUVVFMlFpeExRVUZ1UXp0QlFVTkJMRTFCUVUwc1dVRkJXU3hUUVVGVExHRkJRVlFzUTBGQmRVSXNTMEZCZGtJc1EwRkJiRUk3UVVGRFFTeE5RVUZOTEU5QlFVOHNVMEZCVXl4aFFVRlVMRU5CUVhWQ0xFdEJRWFpDTEVOQlFXSTdRVUZEUVN4UFFVRkxMRk5CUVV3c1IwRkJhVUlzWlVGQmFrSTdRVUZEUVN4UFFVRkxMRWRCUVV3c1IwRkJWeXhIUVVGWU8wRkJRMEVzV1VGQlZTeFhRVUZXTEVOQlFYTkNMRWxCUVhSQ08wRkJRMEVzVlVGQlVTeFhRVUZTTEVOQlFXOUNMRk5CUVhCQ08wRkJRMEVzUlVGU1JEdEJRVk5CTEVOQlZrUTdPMEZCV1VFc1NVRkJUU3huUWtGQlowSXNVMEZCYUVJc1lVRkJaMElzUjBGQlRUdEJRVU16UWl4TFFVRk5MR1ZCUVdVc1UwRkJVeXhqUVVGVUxFTkJRWGRDTEZOQlFYaENMRU5CUVhKQ08wRkJRMEVzUzBGQlRTeGpRVUZqTEZWQlFWVXNVVUZCVVN4UFFVRnNRaXhIUVVFMFFpeFJRVUZSTEZGQlFYaEVPenRCUVVWQkxHTkJRV0VzVTBGQllpeEhRVUY1UWl4RlFVRjZRanM3UVVGRlFTeGhRVUZaTEU5QlFWb3NRMEZCYjBJc2FVSkJRVk03UVVGQlFTeE5RVU53UWl4TFFVUnZRaXhIUVVOM1F5eExRVVI0UXl4RFFVTndRaXhMUVVSdlFqdEJRVUZCTEUxQlEySXNVVUZFWVN4SFFVTjNReXhMUVVSNFF5eERRVU5pTEZGQlJHRTdRVUZCUVN4TlFVTklMRk5CUkVjc1IwRkRkME1zUzBGRWVFTXNRMEZEU0N4VFFVUkhPMEZCUVVFc1RVRkRVU3hOUVVSU0xFZEJRM2RETEV0QlJIaERMRU5CUTFFc1RVRkVVanRCUVVGQkxFMUJRMmRDTEZkQlJHaENMRWRCUTNkRExFdEJSSGhETEVOQlEyZENMRmRCUkdoQ08wRkJRVUVzVFVGRE5rSXNUVUZFTjBJc1IwRkRkME1zUzBGRWVFTXNRMEZETmtJc1RVRkVOMEk3T3p0QlFVYzFRaXhsUVVGaExHdENRVUZpTEVOQlFXZERMRmRCUVdoRExFVkJRVFpETEhsQ1FVRTNRenM3UVVGRlFTeE5RVUZOTEdOQlFXTXNVMEZCVXl4blFrRkJWQ3hEUVVFd1FpeDNRa0ZCTVVJc1EwRkJjRUk3UVVGRFFTeE5RVUZOTEZWQlFWVXNXVUZCV1N4WlFVRlpMRTFCUVZvc1IwRkJjVUlzUTBGQmFrTXNRMEZCYUVJN1FVRkRRVHM3UVVGRlFTeE5RVUZKTEU5QlFVOHNUVUZCV0N4RlFVRnRRaXhoUVVGaExFMUJRV0lzUlVGQmNVSXNUMEZCY2tJN08wRkJSVzVDTEUxQlFVMHNiMEpCUVc5Q0xGTkJRVk1zWVVGQlZDeERRVUYxUWl4TFFVRjJRaXhEUVVFeFFqdEJRVU5CTEUxQlFVMHNiVUpCUVcxQ0xGTkJRVk1zWVVGQlZDeERRVUYxUWl4SFFVRjJRaXhEUVVGNlFqdEJRVU5CTEUxQlFVMHNZMEZCWXl4VFFVRlRMR0ZCUVZRc1EwRkJkVUlzUjBGQmRrSXNRMEZCY0VJN1FVRkRRU3h2UWtGQmEwSXNVMEZCYkVJc1EwRkJORUlzUjBGQk5VSXNRMEZCWjBNc05FSkJRV2hETzBGQlEwRXNiVUpCUVdsQ0xGTkJRV3BDTEVOQlFUSkNMRWRCUVROQ0xFTkJRU3RDTEhGQ1FVRXZRanRCUVVOQkxHTkJRVmtzVTBGQldpeERRVUZ6UWl4SFFVRjBRaXhEUVVFd1FpeG5Ra0ZCTVVJN08wRkJSVUVzYlVKQlFXbENMRk5CUVdwQ0xFZEJRVFpDTEZkQlFUZENPMEZCUTBFc1kwRkJXU3hUUVVGYUxFZEJRWGRDTEUxQlFYaENPenRCUVVWQkxHOUNRVUZyUWl4WFFVRnNRaXhEUVVFNFFpeG5Ra0ZCT1VJc1JVRkJaMFFzVjBGQmFFUTdRVUZEUVN4VlFVRlJMRmRCUVZJc1EwRkJiMElzYVVKQlFYQkNPenRCUVVWQkxFMUJRVTBzWTBGQll5eFRRVUZUTEdkQ1FVRlVMRU5CUVRCQ0xIbENRVUV4UWl4RFFVRndRanRCUVVOQkxFMUJRVTBzVTBGQlV5eFpRVUZaTEZsQlFWa3NUVUZCV2l4SFFVRnhRaXhEUVVGcVF5eERRVUZtT3p0QlFVVkJMRTFCUVUwc1kwRkJZeXhUUVVGVExHZENRVUZVTEVOQlFUQkNMQ3RDUVVFeFFpeERRVUZ3UWp0QlFVTkJMRTFCUVUwc1UwRkJVeXhaUVVGWkxGbEJRVmtzVFVGQldpeEhRVUZ4UWl4RFFVRnFReXhEUVVGbU96dEJRVVZCTEUxQlFVMHNZVUZCWVN4VFFVRlRMR2RDUVVGVUxFTkJRVEJDTERoQ1FVRXhRaXhEUVVGdVFqdEJRVU5CTEUxQlFVMHNVVUZCVVN4WFFVRlhMRmRCUVZjc1RVRkJXQ3hIUVVGdlFpeERRVUV2UWl4RFFVRmtPenRCUVVWQkxGTkJRVThzVTBGQlVDeEhRVUZ0UWl4TFFVRnVRanRCUVVOQkxGTkJRVThzVTBGQlVDeEhRVUZ0UWl4VFFVRnVRanRCUVVOQkxGRkJRVTBzVTBGQlRpeEhRVUZyUWl4UlFVRnNRanM3UVVGRlFTeE5RVUZOTEdGQlFXRXNVVUZCVVN4aFFVRlNMRU5CUVhOQ0xHRkJRWFJDTEVOQlFXOURMR0ZCUVhCRExFTkJRVzVDTzBGQlEwRXNUVUZCVFN4aFFVRmhMRkZCUVZFc1lVRkJVaXhEUVVGelFpeGhRVUYwUWl4RFFVRnZReXhoUVVGd1F5eERRVUZ1UWpzN1FVRkZRU3hOUVVGSkxGVkJRVlVzVVVGQlVTeHBRa0ZCZEVJN1FVRkRRU3hoUVVGWExHZENRVUZZTEVOQlFUUkNMRTlCUVRWQ0xFVkJRWEZETEZsQlFVMDdRVUZETVVNc1QwRkJUU3hQUVVGUExGRkJRVkVzYTBKQlFYSkNPMEZCUTBFc1QwRkJTU3hKUVVGS0xFVkJRVlU3UVVGRFZDeFRRVUZMTEdOQlFVd3NRMEZCYjBJc1JVRkJReXhWUVVGVkxGRkJRVmdzUlVGQmNVSXNUMEZCVHl4VFFVRTFRaXhGUVVGMVF5eFJRVUZSTEZGQlFTOURMRVZCUVhCQ08wRkJRMEVzWTBGQlZTeEpRVUZXTzBGQlEwRTdRVUZEUkN4SFFVNUVPenRCUVZGQkxHRkJRVmNzWjBKQlFWZ3NRMEZCTkVJc1QwRkJOVUlzUlVGQmNVTXNXVUZCVFR0QlFVTXhReXhQUVVGTkxFOUJRVThzVVVGQlVTeHpRa0ZCY2tJN1FVRkRRU3hQUVVGSkxFbEJRVW9zUlVGQlZUdEJRVU5VTEZOQlFVc3NZMEZCVEN4RFFVRnZRaXhGUVVGRExGVkJRVlVzVVVGQldDeEZRVUZ4UWl4UFFVRlBMRk5CUVRWQ0xFVkJRWFZETEZGQlFWRXNVVUZCTDBNc1JVRkJjRUk3UVVGRFFTeGpRVUZWTEVsQlFWWTdRVUZEUVR0QlFVTkVMRWRCVGtRN1FVRlBRU3hGUVhoRVJEczdRVUV3UkVFN1FVRkRRVHRCUVVOQkxFTkJiRVZFT3p0QlFXOUZRVHRCUVVOQkxFbEJRVTBzWTBGQll5eFRRVUZrTEZkQlFXTXNSMEZCVFR0QlFVTjZRaXhUUVVGUkxFOUJRVklzUTBGQlowSXNTVUZCYUVJc1EwRkJjVUlzVlVGQlF5eERRVUZFTEVWQlFVa3NRMEZCU2l4RlFVRlZPMEZCUXpsQ0xFMUJRVWtzVTBGQlV5eEZRVUZGTEV0QlFVWXNRMEZCVVN4RFFVRlNMRVZCUVZjc1YwRkJXQ3hGUVVGaU8wRkJRMEVzVFVGQlNTeFRRVUZUTEVWQlFVVXNTMEZCUml4RFFVRlJMRU5CUVZJc1JVRkJWeXhYUVVGWUxFVkJRV0k3UVVGRFFTeE5RVUZKTEZOQlFWTXNUVUZCWWl4RlFVRnhRaXhQUVVGUExFTkJRVkFzUTBGQmNrSXNTMEZEU3l4SlFVRkpMRk5CUVZNc1RVRkJZaXhGUVVGeFFpeFBRVUZQTEVOQlFVTXNRMEZCVWl4RFFVRnlRaXhMUVVOQkxFOUJRVThzUTBGQlVEdEJRVU5NTEVWQlRrUTdRVUZQUVN4RFFWSkVPenRCUVZWQkxFbEJRVTBzVlVGQlZTeFRRVUZXTEU5QlFWVXNRMEZCUXl4SlFVRkVMRVZCUVZVN1FVRkRla0lzVTBGQlVTeFJRVUZTTEVkQlFXMUNMRWxCUVc1Q08wRkJRMEVzVTBGQlVTeFBRVUZTTEVkQlFXdENMRXRCUVVzc1MwRkJUQ3hGUVVGc1FpeERRVVo1UWl4RFFVVlBPMEZCUTJoRE8wRkJRMEU3UVVGRFFTeERRVXhFT3p0QlFVOUJMRWxCUVUwc1dVRkJXU3hUUVVGYUxGTkJRVmtzUjBGQlRUdEJRVU4wUWl4UFFVRk5MRVZCUVU0c1JVRkJWU3hKUVVGV0xFTkJRV1U3UVVGQlFTeFRRVU5rTEVsQlFVa3NTVUZCU2l4RlFVUmpPMEZCUVVFc1JVRkJaaXhGUVVWRkxFbEJSa1lzUTBGRlR5eG5Ra0ZCVVR0QlFVTmtMRlZCUVZFc1NVRkJVanRCUVVOQkxFVkJTa1FzUlVGTFF5eEpRVXhFTEVOQlMwMHNXVUZCVFR0QlFVTllMRmRCUVZNc1QwRkJWQ3hEUVVGcFFqdEJRVUZCTEZWQlFWRXNTMEZCU3l4VFFVRk1MRU5CUVdVc1IwRkJaaXhEUVVGdFFpeFBRVUZ1UWl4RFFVRlNPMEZCUVVFc1IwRkJha0k3UVVGRFFTeFBRVUZMTEZOQlFVd3NRMEZCWlN4SFFVRm1MRU5CUVcxQ0xFOUJRVzVDTzBGQlEwRXNSVUZTUkN4RlFWTkRMRXRCVkVRc1EwRlRUenRCUVVGQkxGTkJRVThzVVVGQlVTeEpRVUZTTEVOQlFXRXNSMEZCWWl4RFFVRlFPMEZCUVVFc1JVRlVVRHRCUVZWRUxFTkJXRVE3TzBGQllVRXNTVUZCVFN4UFFVRlBMRk5CUVZBc1NVRkJUeXhIUVVGTk8wRkJRMnhDTEdkRFFVRmhMRkZCUVdJN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVN4RFFWSkVPenRCUVZWQk96czdPenM3T3p0QlEycFVRU3hKUVVGTkxHMXRRa0ZCVGpzN1FVRnBRa0VzU1VGQlRTeFJRVUZSTEZOQlFWSXNTMEZCVVN4SFFVRk5PMEZCUTI1Q0xFdEJRVWtzVjBGQlZ5eFRRVUZUTEdOQlFWUXNRMEZCZDBJc1VVRkJlRUlzUTBGQlpqdEJRVU5CTEZWQlFWTXNVMEZCVkN4SFFVRnhRaXhSUVVGeVFqdEJRVU5CTEVOQlNFUTdPMnRDUVV0bExFczdPenM3T3pzN08wRkRkRUptTEVsQlFVMHNWMEZCVnl4VFFVRllMRkZCUVZjc1EwRkJReXhGUVVGRUxFVkJRVXNzU1VGQlRDeEZRVUZqTzBGQlF6ZENMRTFCUVVrc1owSkJRVW83TzBGQlJVRXNVMEZCVHl4WlFVRlhPMEZCUVVFN1FVRkJRVHM3UVVGRGFFSXNVVUZCVFN4bFFVRmxMRk5CUVdZc1dVRkJaVHRCUVVGQkxHRkJRVTBzUjBGQlJ5eExRVUZJTEVOQlFWTXNTMEZCVkN4RlFVRmxMRlZCUVdZc1EwRkJUanRCUVVGQkxFdEJRWEpDT3p0QlFVVkJMR2xDUVVGaExFOUJRV0k3UVVGRFFTeGpRVUZWTEZkQlFWY3NXVUZCV0N4RlFVRjVRaXhKUVVGNlFpeERRVUZXTzBGQlEwUXNSMEZNUkR0QlFVMUVMRU5CVkVRN08xRkJWMU1zVVN4SFFVRkJMRkVpTENKbWFXeGxJam9pWjJWdVpYSmhkR1ZrTG1weklpd2ljMjkxY21ObFVtOXZkQ0k2SWlJc0luTnZkWEpqWlhORGIyNTBaVzUwSWpwYklpaG1kVzVqZEdsdmJpZ3BlMloxYm1OMGFXOXVJSElvWlN4dUxIUXBlMloxYm1OMGFXOXVJRzhvYVN4bUtYdHBaaWdoYmx0cFhTbDdhV1lvSVdWYmFWMHBlM1poY2lCalBWd2lablZ1WTNScGIyNWNJajA5ZEhsd1pXOW1JSEpsY1hWcGNtVW1KbkpsY1hWcGNtVTdhV1lvSVdZbUptTXBjbVYwZFhKdUlHTW9hU3doTUNrN2FXWW9kU2x5WlhSMWNtNGdkU2hwTENFd0tUdDJZWElnWVQxdVpYY2dSWEp5YjNJb1hDSkRZVzV1YjNRZ1ptbHVaQ0J0YjJSMWJHVWdKMXdpSzJrclhDSW5YQ0lwTzNSb2NtOTNJR0V1WTI5a1pUMWNJazFQUkZWTVJWOU9UMVJmUms5VlRrUmNJaXhoZlhaaGNpQndQVzViYVYwOWUyVjRjRzl5ZEhNNmUzMTlPMlZiYVYxYk1GMHVZMkZzYkNod0xtVjRjRzl5ZEhNc1puVnVZM1JwYjI0b2NpbDdkbUZ5SUc0OVpWdHBYVnN4WFZ0eVhUdHlaWFIxY200Z2J5aHVmSHh5S1gwc2NDeHdMbVY0Y0c5eWRITXNjaXhsTEc0c2RDbDljbVYwZFhKdUlHNWJhVjB1Wlhod2IzSjBjMzFtYjNJb2RtRnlJSFU5WENKbWRXNWpkR2x2Ymx3aVBUMTBlWEJsYjJZZ2NtVnhkV2x5WlNZbWNtVnhkV2x5WlN4cFBUQTdhVHgwTG14bGJtZDBhRHRwS3lzcGJ5aDBXMmxkS1R0eVpYUjFjbTRnYjMxeVpYUjFjbTRnY24wcEtDa2lMQ0l2S2lCemJXOXZkR2h6WTNKdmJHd2dkakF1TkM0d0lDMGdNakF4T0NBdElFUjFjM1JoYmlCTFlYTjBaVzRzSUVwbGNtVnRhV0Z6SUUxbGJtbGphR1ZzYkdrZ0xTQk5TVlFnVEdsalpXNXpaU0FxTDF4dUtHWjFibU4wYVc5dUlDZ3BJSHRjYmlBZ0ozVnpaU0J6ZEhKcFkzUW5PMXh1WEc0Z0lDOHZJSEJ2YkhsbWFXeHNYRzRnSUdaMWJtTjBhVzl1SUhCdmJIbG1hV3hzS0NrZ2UxeHVJQ0FnSUM4dklHRnNhV0Z6WlhOY2JpQWdJQ0IyWVhJZ2R5QTlJSGRwYm1SdmR6dGNiaUFnSUNCMllYSWdaQ0E5SUdSdlkzVnRaVzUwTzF4dVhHNGdJQ0FnTHk4Z2NtVjBkWEp1SUdsbUlITmpjbTlzYkNCaVpXaGhkbWx2Y2lCcGN5QnpkWEJ3YjNKMFpXUWdZVzVrSUhCdmJIbG1hV3hzSUdseklHNXZkQ0JtYjNKalpXUmNiaUFnSUNCcFppQW9YRzRnSUNBZ0lDQW5jMk55YjJ4c1FtVm9ZWFpwYjNJbklHbHVJR1F1Wkc5amRXMWxiblJGYkdWdFpXNTBMbk4wZVd4bElDWW1YRzRnSUNBZ0lDQjNMbDlmWm05eVkyVlRiVzl2ZEdoVFkzSnZiR3hRYjJ4NVptbHNiRjlmSUNFOVBTQjBjblZsWEc0Z0lDQWdLU0I3WEc0Z0lDQWdJQ0J5WlhSMWNtNDdYRzRnSUNBZ2ZWeHVYRzRnSUNBZ0x5OGdaMnh2WW1Gc2MxeHVJQ0FnSUhaaGNpQkZiR1Z0Wlc1MElEMGdkeTVJVkUxTVJXeGxiV1Z1ZENCOGZDQjNMa1ZzWlcxbGJuUTdYRzRnSUNBZ2RtRnlJRk5EVWs5TVRGOVVTVTFGSUQwZ05EWTRPMXh1WEc0Z0lDQWdMeThnYjJKcVpXTjBJR2RoZEdobGNtbHVaeUJ2Y21sbmFXNWhiQ0J6WTNKdmJHd2diV1YwYUc5a2MxeHVJQ0FnSUhaaGNpQnZjbWxuYVc1aGJDQTlJSHRjYmlBZ0lDQWdJSE5qY205c2JEb2dkeTV6WTNKdmJHd2dmSHdnZHk1elkzSnZiR3hVYnl4Y2JpQWdJQ0FnSUhOamNtOXNiRUo1T2lCM0xuTmpjbTlzYkVKNUxGeHVJQ0FnSUNBZ1pXeGxiV1Z1ZEZOamNtOXNiRG9nUld4bGJXVnVkQzV3Y205MGIzUjVjR1V1YzJOeWIyeHNJSHg4SUhOamNtOXNiRVZzWlcxbGJuUXNYRzRnSUNBZ0lDQnpZM0p2Ykd4SmJuUnZWbWxsZHpvZ1JXeGxiV1Z1ZEM1d2NtOTBiM1I1Y0dVdWMyTnliMnhzU1c1MGIxWnBaWGRjYmlBZ0lDQjlPMXh1WEc0Z0lDQWdMeThnWkdWbWFXNWxJSFJwYldsdVp5QnRaWFJvYjJSY2JpQWdJQ0IyWVhJZ2JtOTNJRDFjYmlBZ0lDQWdJSGN1Y0dWeVptOXliV0Z1WTJVZ0ppWWdkeTV3WlhKbWIzSnRZVzVqWlM1dWIzZGNiaUFnSUNBZ0lDQWdQeUIzTG5CbGNtWnZjbTFoYm1ObExtNXZkeTVpYVc1a0tIY3VjR1Z5Wm05eWJXRnVZMlVwWEc0Z0lDQWdJQ0FnSURvZ1JHRjBaUzV1YjNjN1hHNWNiaUFnSUNBdktpcGNiaUFnSUNBZ0tpQnBibVJwWTJGMFpYTWdhV1lnWVNCMGFHVWdZM1Z5Y21WdWRDQmljbTkzYzJWeUlHbHpJRzFoWkdVZ1lua2dUV2xqY205emIyWjBYRzRnSUNBZ0lDb2dRRzFsZEdodlpDQnBjMDFwWTNKdmMyOW1kRUp5YjNkelpYSmNiaUFnSUNBZ0tpQkFjR0Z5WVcwZ2UxTjBjbWx1WjMwZ2RYTmxja0ZuWlc1MFhHNGdJQ0FnSUNvZ1FISmxkSFZ5Ym5NZ2UwSnZiMnhsWVc1OVhHNGdJQ0FnSUNvdlhHNGdJQ0FnWm5WdVkzUnBiMjRnYVhOTmFXTnliM052Wm5SQ2NtOTNjMlZ5S0hWelpYSkJaMlZ1ZENrZ2UxeHVJQ0FnSUNBZ2RtRnlJSFZ6WlhKQloyVnVkRkJoZEhSbGNtNXpJRDBnV3lkTlUwbEZJQ2NzSUNkVWNtbGtaVzUwTHljc0lDZEZaR2RsTHlkZE8xeHVYRzRnSUNBZ0lDQnlaWFIxY200Z2JtVjNJRkpsWjBWNGNDaDFjMlZ5UVdkbGJuUlFZWFIwWlhKdWN5NXFiMmx1S0NkOEp5a3BMblJsYzNRb2RYTmxja0ZuWlc1MEtUdGNiaUFnSUNCOVhHNWNiaUFnSUNBdktseHVJQ0FnSUNBcUlFbEZJR2hoY3lCeWIzVnVaR2x1WnlCaWRXY2djbTkxYm1ScGJtY2daRzkzYmlCamJHbGxiblJJWldsbmFIUWdZVzVrSUdOc2FXVnVkRmRwWkhSb0lHRnVaRnh1SUNBZ0lDQXFJSEp2ZFc1a2FXNW5JSFZ3SUhOamNtOXNiRWhsYVdkb2RDQmhibVFnYzJOeWIyeHNWMmxrZEdnZ1kyRjFjMmx1WnlCbVlXeHpaU0J3YjNOcGRHbDJaWE5jYmlBZ0lDQWdLaUJ2YmlCb1lYTlRZM0p2Ykd4aFlteGxVM0JoWTJWY2JpQWdJQ0FnS2k5Y2JpQWdJQ0IyWVhJZ1VrOVZUa1JKVGtkZlZFOU1SVkpCVGtORklEMGdhWE5OYVdOeWIzTnZablJDY205M2MyVnlLSGN1Ym1GMmFXZGhkRzl5TG5WelpYSkJaMlZ1ZENrZ1B5QXhJRG9nTUR0Y2JseHVJQ0FnSUM4cUtseHVJQ0FnSUNBcUlHTm9ZVzVuWlhNZ2MyTnliMnhzSUhCdmMybDBhVzl1SUdsdWMybGtaU0JoYmlCbGJHVnRaVzUwWEc0Z0lDQWdJQ29nUUcxbGRHaHZaQ0J6WTNKdmJHeEZiR1Z0Wlc1MFhHNGdJQ0FnSUNvZ1FIQmhjbUZ0SUh0T2RXMWlaWEo5SUhoY2JpQWdJQ0FnS2lCQWNHRnlZVzBnZTA1MWJXSmxjbjBnZVZ4dUlDQWdJQ0FxSUVCeVpYUjFjbTV6SUh0MWJtUmxabWx1WldSOVhHNGdJQ0FnSUNvdlhHNGdJQ0FnWm5WdVkzUnBiMjRnYzJOeWIyeHNSV3hsYldWdWRDaDRMQ0I1S1NCN1hHNGdJQ0FnSUNCMGFHbHpMbk5qY205c2JFeGxablFnUFNCNE8xeHVJQ0FnSUNBZ2RHaHBjeTV6WTNKdmJHeFViM0FnUFNCNU8xeHVJQ0FnSUgxY2JseHVJQ0FnSUM4cUtseHVJQ0FnSUNBcUlISmxkSFZ5Ym5NZ2NtVnpkV3gwSUc5bUlHRndjR3g1YVc1bklHVmhjMlVnYldGMGFDQm1kVzVqZEdsdmJpQjBieUJoSUc1MWJXSmxjbHh1SUNBZ0lDQXFJRUJ0WlhSb2IyUWdaV0Z6WlZ4dUlDQWdJQ0FxSUVCd1lYSmhiU0I3VG5WdFltVnlmU0JyWEc0Z0lDQWdJQ29nUUhKbGRIVnlibk1nZTA1MWJXSmxjbjFjYmlBZ0lDQWdLaTljYmlBZ0lDQm1kVzVqZEdsdmJpQmxZWE5sS0dzcElIdGNiaUFnSUNBZ0lISmxkSFZ5YmlBd0xqVWdLaUFvTVNBdElFMWhkR2d1WTI5ektFMWhkR2d1VUVrZ0tpQnJLU2s3WEc0Z0lDQWdmVnh1WEc0Z0lDQWdMeW9xWEc0Z0lDQWdJQ29nYVc1a2FXTmhkR1Z6SUdsbUlHRWdjMjF2YjNSb0lHSmxhR0YyYVc5eUlITm9iM1ZzWkNCaVpTQmhjSEJzYVdWa1hHNGdJQ0FnSUNvZ1FHMWxkR2h2WkNCemFHOTFiR1JDWVdsc1QzVjBYRzRnSUNBZ0lDb2dRSEJoY21GdElIdE9kVzFpWlhKOFQySnFaV04wZlNCbWFYSnpkRUZ5WjF4dUlDQWdJQ0FxSUVCeVpYUjFjbTV6SUh0Q2IyOXNaV0Z1ZlZ4dUlDQWdJQ0FxTDF4dUlDQWdJR1oxYm1OMGFXOXVJSE5vYjNWc1pFSmhhV3hQZFhRb1ptbHljM1JCY21jcElIdGNiaUFnSUNBZ0lHbG1JQ2hjYmlBZ0lDQWdJQ0FnWm1seWMzUkJjbWNnUFQwOUlHNTFiR3dnZkh4Y2JpQWdJQ0FnSUNBZ2RIbHdaVzltSUdacGNuTjBRWEpuSUNFOVBTQW5iMkpxWldOMEp5QjhmRnh1SUNBZ0lDQWdJQ0JtYVhKemRFRnlaeTVpWldoaGRtbHZjaUE5UFQwZ2RXNWtaV1pwYm1Wa0lIeDhYRzRnSUNBZ0lDQWdJR1pwY25OMFFYSm5MbUpsYUdGMmFXOXlJRDA5UFNBbllYVjBieWNnZkh4Y2JpQWdJQ0FnSUNBZ1ptbHljM1JCY21jdVltVm9ZWFpwYjNJZ1BUMDlJQ2RwYm5OMFlXNTBKMXh1SUNBZ0lDQWdLU0I3WEc0Z0lDQWdJQ0FnSUM4dklHWnBjbk4wSUdGeVozVnRaVzUwSUdseklHNXZkQ0JoYmlCdlltcGxZM1F2Ym5Wc2JGeHVJQ0FnSUNBZ0lDQXZMeUJ2Y2lCaVpXaGhkbWx2Y2lCcGN5QmhkWFJ2TENCcGJuTjBZVzUwSUc5eUlIVnVaR1ZtYVc1bFpGeHVJQ0FnSUNBZ0lDQnlaWFIxY200Z2RISjFaVHRjYmlBZ0lDQWdJSDFjYmx4dUlDQWdJQ0FnYVdZZ0tIUjVjR1Z2WmlCbWFYSnpkRUZ5WnlBOVBUMGdKMjlpYW1WamRDY2dKaVlnWm1seWMzUkJjbWN1WW1Wb1lYWnBiM0lnUFQwOUlDZHpiVzl2ZEdnbktTQjdYRzRnSUNBZ0lDQWdJQzh2SUdacGNuTjBJR0Z5WjNWdFpXNTBJR2x6SUdGdUlHOWlhbVZqZENCaGJtUWdZbVZvWVhacGIzSWdhWE1nYzIxdmIzUm9YRzRnSUNBZ0lDQWdJSEpsZEhWeWJpQm1ZV3h6WlR0Y2JpQWdJQ0FnSUgxY2JseHVJQ0FnSUNBZ0x5OGdkR2h5YjNjZ1pYSnliM0lnZDJobGJpQmlaV2hoZG1sdmNpQnBjeUJ1YjNRZ2MzVndjRzl5ZEdWa1hHNGdJQ0FnSUNCMGFISnZkeUJ1WlhjZ1ZIbHdaVVZ5Y205eUtGeHVJQ0FnSUNBZ0lDQW5ZbVZvWVhacGIzSWdiV1Z0WW1WeUlHOW1JRk5qY205c2JFOXdkR2x2Ym5NZ0p5QXJYRzRnSUNBZ0lDQWdJQ0FnWm1seWMzUkJjbWN1WW1Wb1lYWnBiM0lnSzF4dUlDQWdJQ0FnSUNBZ0lDY2dhWE1nYm05MElHRWdkbUZzYVdRZ2RtRnNkV1VnWm05eUlHVnVkVzFsY21GMGFXOXVJRk5qY205c2JFSmxhR0YyYVc5eUxpZGNiaUFnSUNBZ0lDazdYRzRnSUNBZ2ZWeHVYRzRnSUNBZ0x5b3FYRzRnSUNBZ0lDb2dhVzVrYVdOaGRHVnpJR2xtSUdGdUlHVnNaVzFsYm5RZ2FHRnpJSE5qY205c2JHRmliR1VnYzNCaFkyVWdhVzRnZEdobElIQnliM1pwWkdWa0lHRjRhWE5jYmlBZ0lDQWdLaUJBYldWMGFHOWtJR2hoYzFOamNtOXNiR0ZpYkdWVGNHRmpaVnh1SUNBZ0lDQXFJRUJ3WVhKaGJTQjdUbTlrWlgwZ1pXeGNiaUFnSUNBZ0tpQkFjR0Z5WVcwZ2UxTjBjbWx1WjMwZ1lYaHBjMXh1SUNBZ0lDQXFJRUJ5WlhSMWNtNXpJSHRDYjI5c1pXRnVmVnh1SUNBZ0lDQXFMMXh1SUNBZ0lHWjFibU4wYVc5dUlHaGhjMU5qY205c2JHRmliR1ZUY0dGalpTaGxiQ3dnWVhocGN5a2dlMXh1SUNBZ0lDQWdhV1lnS0dGNGFYTWdQVDA5SUNkWkp5a2dlMXh1SUNBZ0lDQWdJQ0J5WlhSMWNtNGdaV3d1WTJ4cFpXNTBTR1ZwWjJoMElDc2dVazlWVGtSSlRrZGZWRTlNUlZKQlRrTkZJRHdnWld3dWMyTnliMnhzU0dWcFoyaDBPMXh1SUNBZ0lDQWdmVnh1WEc0Z0lDQWdJQ0JwWmlBb1lYaHBjeUE5UFQwZ0oxZ25LU0I3WEc0Z0lDQWdJQ0FnSUhKbGRIVnliaUJsYkM1amJHbGxiblJYYVdSMGFDQXJJRkpQVlU1RVNVNUhYMVJQVEVWU1FVNURSU0E4SUdWc0xuTmpjbTlzYkZkcFpIUm9PMXh1SUNBZ0lDQWdmVnh1SUNBZ0lIMWNibHh1SUNBZ0lDOHFLbHh1SUNBZ0lDQXFJR2x1WkdsallYUmxjeUJwWmlCaGJpQmxiR1Z0Wlc1MElHaGhjeUJoSUhOamNtOXNiR0ZpYkdVZ2IzWmxjbVpzYjNjZ2NISnZjR1Z5ZEhrZ2FXNGdkR2hsSUdGNGFYTmNiaUFnSUNBZ0tpQkFiV1YwYUc5a0lHTmhiazkyWlhKbWJHOTNYRzRnSUNBZ0lDb2dRSEJoY21GdElIdE9iMlJsZlNCbGJGeHVJQ0FnSUNBcUlFQndZWEpoYlNCN1UzUnlhVzVuZlNCaGVHbHpYRzRnSUNBZ0lDb2dRSEpsZEhWeWJuTWdlMEp2YjJ4bFlXNTlYRzRnSUNBZ0lDb3ZYRzRnSUNBZ1puVnVZM1JwYjI0Z1kyRnVUM1psY21ac2IzY29aV3dzSUdGNGFYTXBJSHRjYmlBZ0lDQWdJSFpoY2lCdmRtVnlabXh2ZDFaaGJIVmxJRDBnZHk1blpYUkRiMjF3ZFhSbFpGTjBlV3hsS0dWc0xDQnVkV3hzS1ZzbmIzWmxjbVpzYjNjbklDc2dZWGhwYzEwN1hHNWNiaUFnSUNBZ0lISmxkSFZ5YmlCdmRtVnlabXh2ZDFaaGJIVmxJRDA5UFNBbllYVjBieWNnZkh3Z2IzWmxjbVpzYjNkV1lXeDFaU0E5UFQwZ0ozTmpjbTlzYkNjN1hHNGdJQ0FnZlZ4dVhHNGdJQ0FnTHlvcVhHNGdJQ0FnSUNvZ2FXNWthV05oZEdWeklHbG1JR0Z1SUdWc1pXMWxiblFnWTJGdUlHSmxJSE5qY205c2JHVmtJR2x1SUdWcGRHaGxjaUJoZUdselhHNGdJQ0FnSUNvZ1FHMWxkR2h2WkNCcGMxTmpjbTlzYkdGaWJHVmNiaUFnSUNBZ0tpQkFjR0Z5WVcwZ2UwNXZaR1Y5SUdWc1hHNGdJQ0FnSUNvZ1FIQmhjbUZ0SUh0VGRISnBibWQ5SUdGNGFYTmNiaUFnSUNBZ0tpQkFjbVYwZFhKdWN5QjdRbTl2YkdWaGJuMWNiaUFnSUNBZ0tpOWNiaUFnSUNCbWRXNWpkR2x2YmlCcGMxTmpjbTlzYkdGaWJHVW9aV3dwSUh0Y2JpQWdJQ0FnSUhaaGNpQnBjMU5qY205c2JHRmliR1ZaSUQwZ2FHRnpVMk55YjJ4c1lXSnNaVk53WVdObEtHVnNMQ0FuV1NjcElDWW1JR05oYms5MlpYSm1iRzkzS0dWc0xDQW5XU2NwTzF4dUlDQWdJQ0FnZG1GeUlHbHpVMk55YjJ4c1lXSnNaVmdnUFNCb1lYTlRZM0p2Ykd4aFlteGxVM0JoWTJVb1pXd3NJQ2RZSnlrZ0ppWWdZMkZ1VDNabGNtWnNiM2NvWld3c0lDZFlKeWs3WEc1Y2JpQWdJQ0FnSUhKbGRIVnliaUJwYzFOamNtOXNiR0ZpYkdWWklIeDhJR2x6VTJOeWIyeHNZV0pzWlZnN1hHNGdJQ0FnZlZ4dVhHNGdJQ0FnTHlvcVhHNGdJQ0FnSUNvZ1ptbHVaSE1nYzJOeWIyeHNZV0pzWlNCd1lYSmxiblFnYjJZZ1lXNGdaV3hsYldWdWRGeHVJQ0FnSUNBcUlFQnRaWFJvYjJRZ1ptbHVaRk5qY205c2JHRmliR1ZRWVhKbGJuUmNiaUFnSUNBZ0tpQkFjR0Z5WVcwZ2UwNXZaR1Y5SUdWc1hHNGdJQ0FnSUNvZ1FISmxkSFZ5Ym5NZ2UwNXZaR1Y5SUdWc1hHNGdJQ0FnSUNvdlhHNGdJQ0FnWm5WdVkzUnBiMjRnWm1sdVpGTmpjbTlzYkdGaWJHVlFZWEpsYm5Rb1pXd3BJSHRjYmlBZ0lDQWdJSFpoY2lCcGMwSnZaSGs3WEc1Y2JpQWdJQ0FnSUdSdklIdGNiaUFnSUNBZ0lDQWdaV3dnUFNCbGJDNXdZWEpsYm5ST2IyUmxPMXh1WEc0Z0lDQWdJQ0FnSUdselFtOWtlU0E5SUdWc0lEMDlQU0JrTG1KdlpIazdYRzRnSUNBZ0lDQjlJSGRvYVd4bElDaHBjMEp2WkhrZ1BUMDlJR1poYkhObElDWW1JR2x6VTJOeWIyeHNZV0pzWlNobGJDa2dQVDA5SUdaaGJITmxLVHRjYmx4dUlDQWdJQ0FnYVhOQ2IyUjVJRDBnYm5Wc2JEdGNibHh1SUNBZ0lDQWdjbVYwZFhKdUlHVnNPMXh1SUNBZ0lIMWNibHh1SUNBZ0lDOHFLbHh1SUNBZ0lDQXFJSE5sYkdZZ2FXNTJiMnRsWkNCbWRXNWpkR2x2YmlCMGFHRjBMQ0JuYVhabGJpQmhJR052Ym5SbGVIUXNJSE4wWlhCeklIUm9jbTkxWjJnZ2MyTnliMnhzYVc1blhHNGdJQ0FnSUNvZ1FHMWxkR2h2WkNCemRHVndYRzRnSUNBZ0lDb2dRSEJoY21GdElIdFBZbXBsWTNSOUlHTnZiblJsZUhSY2JpQWdJQ0FnS2lCQWNtVjBkWEp1Y3lCN2RXNWtaV1pwYm1Wa2ZWeHVJQ0FnSUNBcUwxeHVJQ0FnSUdaMWJtTjBhVzl1SUhOMFpYQW9ZMjl1ZEdWNGRDa2dlMXh1SUNBZ0lDQWdkbUZ5SUhScGJXVWdQU0J1YjNjb0tUdGNiaUFnSUNBZ0lIWmhjaUIyWVd4MVpUdGNiaUFnSUNBZ0lIWmhjaUJqZFhKeVpXNTBXRHRjYmlBZ0lDQWdJSFpoY2lCamRYSnlaVzUwV1R0Y2JpQWdJQ0FnSUhaaGNpQmxiR0Z3YzJWa0lEMGdLSFJwYldVZ0xTQmpiMjUwWlhoMExuTjBZWEowVkdsdFpTa2dMeUJUUTFKUFRFeGZWRWxOUlR0Y2JseHVJQ0FnSUNBZ0x5OGdZWFp2YVdRZ1pXeGhjSE5sWkNCMGFXMWxjeUJvYVdkb1pYSWdkR2hoYmlCdmJtVmNiaUFnSUNBZ0lHVnNZWEJ6WldRZ1BTQmxiR0Z3YzJWa0lENGdNU0EvSURFZ09pQmxiR0Z3YzJWa08xeHVYRzRnSUNBZ0lDQXZMeUJoY0hCc2VTQmxZWE5wYm1jZ2RHOGdaV3hoY0hObFpDQjBhVzFsWEc0Z0lDQWdJQ0IyWVd4MVpTQTlJR1ZoYzJVb1pXeGhjSE5sWkNrN1hHNWNiaUFnSUNBZ0lHTjFjbkpsYm5SWUlEMGdZMjl1ZEdWNGRDNXpkR0Z5ZEZnZ0t5QW9ZMjl1ZEdWNGRDNTRJQzBnWTI5dWRHVjRkQzV6ZEdGeWRGZ3BJQ29nZG1Gc2RXVTdYRzRnSUNBZ0lDQmpkWEp5Wlc1MFdTQTlJR052Ym5SbGVIUXVjM1JoY25SWklDc2dLR052Ym5SbGVIUXVlU0F0SUdOdmJuUmxlSFF1YzNSaGNuUlpLU0FxSUhaaGJIVmxPMXh1WEc0Z0lDQWdJQ0JqYjI1MFpYaDBMbTFsZEdodlpDNWpZV3hzS0dOdmJuUmxlSFF1YzJOeWIyeHNZV0pzWlN3Z1kzVnljbVZ1ZEZnc0lHTjFjbkpsYm5SWktUdGNibHh1SUNBZ0lDQWdMeThnYzJOeWIyeHNJRzF2Y21VZ2FXWWdkMlVnYUdGMlpTQnViM1FnY21WaFkyaGxaQ0J2ZFhJZ1pHVnpkR2x1WVhScGIyNWNiaUFnSUNBZ0lHbG1JQ2hqZFhKeVpXNTBXQ0FoUFQwZ1kyOXVkR1Y0ZEM1NElIeDhJR04xY25KbGJuUlpJQ0U5UFNCamIyNTBaWGgwTG5rcElIdGNiaUFnSUNBZ0lDQWdkeTV5WlhGMVpYTjBRVzVwYldGMGFXOXVSbkpoYldVb2MzUmxjQzVpYVc1a0tIY3NJR052Ym5SbGVIUXBLVHRjYmlBZ0lDQWdJSDFjYmlBZ0lDQjlYRzVjYmlBZ0lDQXZLaXBjYmlBZ0lDQWdLaUJ6WTNKdmJHeHpJSGRwYm1SdmR5QnZjaUJsYkdWdFpXNTBJSGRwZEdnZ1lTQnpiVzl2ZEdnZ1ltVm9ZWFpwYjNKY2JpQWdJQ0FnS2lCQWJXVjBhRzlrSUhOdGIyOTBhRk5qY205c2JGeHVJQ0FnSUNBcUlFQndZWEpoYlNCN1QySnFaV04wZkU1dlpHVjlJR1ZzWEc0Z0lDQWdJQ29nUUhCaGNtRnRJSHRPZFcxaVpYSjlJSGhjYmlBZ0lDQWdLaUJBY0dGeVlXMGdlMDUxYldKbGNuMGdlVnh1SUNBZ0lDQXFJRUJ5WlhSMWNtNXpJSHQxYm1SbFptbHVaV1I5WEc0Z0lDQWdJQ292WEc0Z0lDQWdablZ1WTNScGIyNGdjMjF2YjNSb1UyTnliMnhzS0dWc0xDQjRMQ0I1S1NCN1hHNGdJQ0FnSUNCMllYSWdjMk55YjJ4c1lXSnNaVHRjYmlBZ0lDQWdJSFpoY2lCemRHRnlkRmc3WEc0Z0lDQWdJQ0IyWVhJZ2MzUmhjblJaTzF4dUlDQWdJQ0FnZG1GeUlHMWxkR2h2WkR0Y2JpQWdJQ0FnSUhaaGNpQnpkR0Z5ZEZScGJXVWdQU0J1YjNjb0tUdGNibHh1SUNBZ0lDQWdMeThnWkdWbWFXNWxJSE5qY205c2JDQmpiMjUwWlhoMFhHNGdJQ0FnSUNCcFppQW9aV3dnUFQwOUlHUXVZbTlrZVNrZ2UxeHVJQ0FnSUNBZ0lDQnpZM0p2Ykd4aFlteGxJRDBnZHp0Y2JpQWdJQ0FnSUNBZ2MzUmhjblJZSUQwZ2R5NXpZM0p2Ykd4WUlIeDhJSGN1Y0dGblpWaFBabVp6WlhRN1hHNGdJQ0FnSUNBZ0lITjBZWEowV1NBOUlIY3VjMk55YjJ4c1dTQjhmQ0IzTG5CaFoyVlpUMlptYzJWME8xeHVJQ0FnSUNBZ0lDQnRaWFJvYjJRZ1BTQnZjbWxuYVc1aGJDNXpZM0p2Ykd3N1hHNGdJQ0FnSUNCOUlHVnNjMlVnZTF4dUlDQWdJQ0FnSUNCelkzSnZiR3hoWW14bElEMGdaV3c3WEc0Z0lDQWdJQ0FnSUhOMFlYSjBXQ0E5SUdWc0xuTmpjbTlzYkV4bFpuUTdYRzRnSUNBZ0lDQWdJSE4wWVhKMFdTQTlJR1ZzTG5OamNtOXNiRlJ2Y0R0Y2JpQWdJQ0FnSUNBZ2JXVjBhRzlrSUQwZ2MyTnliMnhzUld4bGJXVnVkRHRjYmlBZ0lDQWdJSDFjYmx4dUlDQWdJQ0FnTHk4Z2MyTnliMnhzSUd4dmIzQnBibWNnYjNabGNpQmhJR1p5WVcxbFhHNGdJQ0FnSUNCemRHVndLSHRjYmlBZ0lDQWdJQ0FnYzJOeWIyeHNZV0pzWlRvZ2MyTnliMnhzWVdKc1pTeGNiaUFnSUNBZ0lDQWdiV1YwYUc5a09pQnRaWFJvYjJRc1hHNGdJQ0FnSUNBZ0lITjBZWEowVkdsdFpUb2djM1JoY25SVWFXMWxMRnh1SUNBZ0lDQWdJQ0J6ZEdGeWRGZzZJSE4wWVhKMFdDeGNiaUFnSUNBZ0lDQWdjM1JoY25SWk9pQnpkR0Z5ZEZrc1hHNGdJQ0FnSUNBZ0lIZzZJSGdzWEc0Z0lDQWdJQ0FnSUhrNklIbGNiaUFnSUNBZ0lIMHBPMXh1SUNBZ0lIMWNibHh1SUNBZ0lDOHZJRTlTU1VkSlRrRk1JRTFGVkVoUFJGTWdUMVpGVWxKSlJFVlRYRzRnSUNBZ0x5OGdkeTV6WTNKdmJHd2dZVzVrSUhjdWMyTnliMnhzVkc5Y2JpQWdJQ0IzTG5OamNtOXNiQ0E5SUhjdWMyTnliMnhzVkc4Z1BTQm1kVzVqZEdsdmJpZ3BJSHRjYmlBZ0lDQWdJQzh2SUdGMmIybGtJR0ZqZEdsdmJpQjNhR1Z1SUc1dklHRnlaM1Z0Wlc1MGN5QmhjbVVnY0dGemMyVmtYRzRnSUNBZ0lDQnBaaUFvWVhKbmRXMWxiblJ6V3pCZElEMDlQU0IxYm1SbFptbHVaV1FwSUh0Y2JpQWdJQ0FnSUNBZ2NtVjBkWEp1TzF4dUlDQWdJQ0FnZlZ4dVhHNGdJQ0FnSUNBdkx5QmhkbTlwWkNCemJXOXZkR2dnWW1Wb1lYWnBiM0lnYVdZZ2JtOTBJSEpsY1hWcGNtVmtYRzRnSUNBZ0lDQnBaaUFvYzJodmRXeGtRbUZwYkU5MWRDaGhjbWQxYldWdWRITmJNRjBwSUQwOVBTQjBjblZsS1NCN1hHNGdJQ0FnSUNBZ0lHOXlhV2RwYm1Gc0xuTmpjbTlzYkM1allXeHNLRnh1SUNBZ0lDQWdJQ0FnSUhjc1hHNGdJQ0FnSUNBZ0lDQWdZWEpuZFcxbGJuUnpXekJkTG14bFpuUWdJVDA5SUhWdVpHVm1hVzVsWkZ4dUlDQWdJQ0FnSUNBZ0lDQWdQeUJoY21kMWJXVnVkSE5iTUYwdWJHVm1kRnh1SUNBZ0lDQWdJQ0FnSUNBZ09pQjBlWEJsYjJZZ1lYSm5kVzFsYm5Seld6QmRJQ0U5UFNBbmIySnFaV04wSjF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0EvSUdGeVozVnRaVzUwYzFzd1hWeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBNklIY3VjMk55YjJ4c1dDQjhmQ0IzTG5CaFoyVllUMlptYzJWMExGeHVJQ0FnSUNBZ0lDQWdJQzh2SUhWelpTQjBiM0FnY0hKdmNDd2djMlZqYjI1a0lHRnlaM1Z0Wlc1MElHbG1JSEJ5WlhObGJuUWdiM0lnWm1Gc2JHSmhZMnNnZEc4Z2MyTnliMnhzV1Z4dUlDQWdJQ0FnSUNBZ0lHRnlaM1Z0Wlc1MGMxc3dYUzUwYjNBZ0lUMDlJSFZ1WkdWbWFXNWxaRnh1SUNBZ0lDQWdJQ0FnSUNBZ1B5QmhjbWQxYldWdWRITmJNRjB1ZEc5d1hHNGdJQ0FnSUNBZ0lDQWdJQ0E2SUdGeVozVnRaVzUwYzFzeFhTQWhQVDBnZFc1a1pXWnBibVZrWEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJRDhnWVhKbmRXMWxiblJ6V3pGZFhHNGdJQ0FnSUNBZ0lDQWdJQ0FnSURvZ2R5NXpZM0p2Ykd4WklIeDhJSGN1Y0dGblpWbFBabVp6WlhSY2JpQWdJQ0FnSUNBZ0tUdGNibHh1SUNBZ0lDQWdJQ0J5WlhSMWNtNDdYRzRnSUNBZ0lDQjlYRzVjYmlBZ0lDQWdJQzh2SUV4RlZDQlVTRVVnVTAxUFQxUklUa1ZUVXlCQ1JVZEpUaUZjYmlBZ0lDQWdJSE50YjI5MGFGTmpjbTlzYkM1allXeHNLRnh1SUNBZ0lDQWdJQ0IzTEZ4dUlDQWdJQ0FnSUNCa0xtSnZaSGtzWEc0Z0lDQWdJQ0FnSUdGeVozVnRaVzUwYzFzd1hTNXNaV1owSUNFOVBTQjFibVJsWm1sdVpXUmNiaUFnSUNBZ0lDQWdJQ0EvSUg1K1lYSm5kVzFsYm5Seld6QmRMbXhsWm5SY2JpQWdJQ0FnSUNBZ0lDQTZJSGN1YzJOeWIyeHNXQ0I4ZkNCM0xuQmhaMlZZVDJabWMyVjBMRnh1SUNBZ0lDQWdJQ0JoY21kMWJXVnVkSE5iTUYwdWRHOXdJQ0U5UFNCMWJtUmxabWx1WldSY2JpQWdJQ0FnSUNBZ0lDQS9JSDUrWVhKbmRXMWxiblJ6V3pCZExuUnZjRnh1SUNBZ0lDQWdJQ0FnSURvZ2R5NXpZM0p2Ykd4WklIeDhJSGN1Y0dGblpWbFBabVp6WlhSY2JpQWdJQ0FnSUNrN1hHNGdJQ0FnZlR0Y2JseHVJQ0FnSUM4dklIY3VjMk55YjJ4c1FubGNiaUFnSUNCM0xuTmpjbTlzYkVKNUlEMGdablZ1WTNScGIyNG9LU0I3WEc0Z0lDQWdJQ0F2THlCaGRtOXBaQ0JoWTNScGIyNGdkMmhsYmlCdWJ5QmhjbWQxYldWdWRITWdZWEpsSUhCaGMzTmxaRnh1SUNBZ0lDQWdhV1lnS0dGeVozVnRaVzUwYzFzd1hTQTlQVDBnZFc1a1pXWnBibVZrS1NCN1hHNGdJQ0FnSUNBZ0lISmxkSFZ5Ymp0Y2JpQWdJQ0FnSUgxY2JseHVJQ0FnSUNBZ0x5OGdZWFp2YVdRZ2MyMXZiM1JvSUdKbGFHRjJhVzl5SUdsbUlHNXZkQ0J5WlhGMWFYSmxaRnh1SUNBZ0lDQWdhV1lnS0hOb2IzVnNaRUpoYVd4UGRYUW9ZWEpuZFcxbGJuUnpXekJkS1NrZ2UxeHVJQ0FnSUNBZ0lDQnZjbWxuYVc1aGJDNXpZM0p2Ykd4Q2VTNWpZV3hzS0Z4dUlDQWdJQ0FnSUNBZ0lIY3NYRzRnSUNBZ0lDQWdJQ0FnWVhKbmRXMWxiblJ6V3pCZExteGxablFnSVQwOUlIVnVaR1ZtYVc1bFpGeHVJQ0FnSUNBZ0lDQWdJQ0FnUHlCaGNtZDFiV1Z1ZEhOYk1GMHViR1ZtZEZ4dUlDQWdJQ0FnSUNBZ0lDQWdPaUIwZVhCbGIyWWdZWEpuZFcxbGJuUnpXekJkSUNFOVBTQW5iMkpxWldOMEp5QS9JR0Z5WjNWdFpXNTBjMXN3WFNBNklEQXNYRzRnSUNBZ0lDQWdJQ0FnWVhKbmRXMWxiblJ6V3pCZExuUnZjQ0FoUFQwZ2RXNWtaV1pwYm1Wa1hHNGdJQ0FnSUNBZ0lDQWdJQ0EvSUdGeVozVnRaVzUwYzFzd1hTNTBiM0JjYmlBZ0lDQWdJQ0FnSUNBZ0lEb2dZWEpuZFcxbGJuUnpXekZkSUNFOVBTQjFibVJsWm1sdVpXUWdQeUJoY21kMWJXVnVkSE5iTVYwZ09pQXdYRzRnSUNBZ0lDQWdJQ2s3WEc1Y2JpQWdJQ0FnSUNBZ2NtVjBkWEp1TzF4dUlDQWdJQ0FnZlZ4dVhHNGdJQ0FnSUNBdkx5Qk1SVlFnVkVoRklGTk5UMDlVU0U1RlUxTWdRa1ZIU1U0aFhHNGdJQ0FnSUNCemJXOXZkR2hUWTNKdmJHd3VZMkZzYkNoY2JpQWdJQ0FnSUNBZ2R5eGNiaUFnSUNBZ0lDQWdaQzVpYjJSNUxGeHVJQ0FnSUNBZ0lDQitmbUZ5WjNWdFpXNTBjMXN3WFM1c1pXWjBJQ3NnS0hjdWMyTnliMnhzV0NCOGZDQjNMbkJoWjJWWVQyWm1jMlYwS1N4Y2JpQWdJQ0FnSUNBZ2ZuNWhjbWQxYldWdWRITmJNRjB1ZEc5d0lDc2dLSGN1YzJOeWIyeHNXU0I4ZkNCM0xuQmhaMlZaVDJabWMyVjBLVnh1SUNBZ0lDQWdLVHRjYmlBZ0lDQjlPMXh1WEc0Z0lDQWdMeThnUld4bGJXVnVkQzV3Y205MGIzUjVjR1V1YzJOeWIyeHNJR0Z1WkNCRmJHVnRaVzUwTG5CeWIzUnZkSGx3WlM1elkzSnZiR3hVYjF4dUlDQWdJRVZzWlcxbGJuUXVjSEp2ZEc5MGVYQmxMbk5qY205c2JDQTlJRVZzWlcxbGJuUXVjSEp2ZEc5MGVYQmxMbk5qY205c2JGUnZJRDBnWm5WdVkzUnBiMjRvS1NCN1hHNGdJQ0FnSUNBdkx5QmhkbTlwWkNCaFkzUnBiMjRnZDJobGJpQnVieUJoY21kMWJXVnVkSE1nWVhKbElIQmhjM05sWkZ4dUlDQWdJQ0FnYVdZZ0tHRnlaM1Z0Wlc1MGMxc3dYU0E5UFQwZ2RXNWtaV1pwYm1Wa0tTQjdYRzRnSUNBZ0lDQWdJSEpsZEhWeWJqdGNiaUFnSUNBZ0lIMWNibHh1SUNBZ0lDQWdMeThnWVhadmFXUWdjMjF2YjNSb0lHSmxhR0YyYVc5eUlHbG1JRzV2ZENCeVpYRjFhWEpsWkZ4dUlDQWdJQ0FnYVdZZ0tITm9iM1ZzWkVKaGFXeFBkWFFvWVhKbmRXMWxiblJ6V3pCZEtTQTlQVDBnZEhKMVpTa2dlMXh1SUNBZ0lDQWdJQ0F2THlCcFppQnZibVVnYm5WdFltVnlJR2x6SUhCaGMzTmxaQ3dnZEdoeWIzY2daWEp5YjNJZ2RHOGdiV0YwWTJnZ1JtbHlaV1p2ZUNCcGJYQnNaVzFsYm5SaGRHbHZibHh1SUNBZ0lDQWdJQ0JwWmlBb2RIbHdaVzltSUdGeVozVnRaVzUwYzFzd1hTQTlQVDBnSjI1MWJXSmxjaWNnSmlZZ1lYSm5kVzFsYm5Seld6RmRJRDA5UFNCMWJtUmxabWx1WldRcElIdGNiaUFnSUNBZ0lDQWdJQ0IwYUhKdmR5QnVaWGNnVTNsdWRHRjRSWEp5YjNJb0oxWmhiSFZsSUdOdmRXeGtJRzV2ZENCaVpTQmpiMjUyWlhKMFpXUW5LVHRjYmlBZ0lDQWdJQ0FnZlZ4dVhHNGdJQ0FnSUNBZ0lHOXlhV2RwYm1Gc0xtVnNaVzFsYm5SVFkzSnZiR3d1WTJGc2JDaGNiaUFnSUNBZ0lDQWdJQ0IwYUdsekxGeHVJQ0FnSUNBZ0lDQWdJQzh2SUhWelpTQnNaV1owSUhCeWIzQXNJR1pwY25OMElHNTFiV0psY2lCaGNtZDFiV1Z1ZENCdmNpQm1ZV3hzWW1GamF5QjBieUJ6WTNKdmJHeE1aV1owWEc0Z0lDQWdJQ0FnSUNBZ1lYSm5kVzFsYm5Seld6QmRMbXhsWm5RZ0lUMDlJSFZ1WkdWbWFXNWxaRnh1SUNBZ0lDQWdJQ0FnSUNBZ1B5QitmbUZ5WjNWdFpXNTBjMXN3WFM1c1pXWjBYRzRnSUNBZ0lDQWdJQ0FnSUNBNklIUjVjR1Z2WmlCaGNtZDFiV1Z1ZEhOYk1GMGdJVDA5SUNkdlltcGxZM1FuSUQ4Z2ZuNWhjbWQxYldWdWRITmJNRjBnT2lCMGFHbHpMbk5qY205c2JFeGxablFzWEc0Z0lDQWdJQ0FnSUNBZ0x5OGdkWE5sSUhSdmNDQndjbTl3TENCelpXTnZibVFnWVhKbmRXMWxiblFnYjNJZ1ptRnNiR0poWTJzZ2RHOGdjMk55YjJ4c1ZHOXdYRzRnSUNBZ0lDQWdJQ0FnWVhKbmRXMWxiblJ6V3pCZExuUnZjQ0FoUFQwZ2RXNWtaV1pwYm1Wa1hHNGdJQ0FnSUNBZ0lDQWdJQ0EvSUg1K1lYSm5kVzFsYm5Seld6QmRMblJ2Y0Z4dUlDQWdJQ0FnSUNBZ0lDQWdPaUJoY21kMWJXVnVkSE5iTVYwZ0lUMDlJSFZ1WkdWbWFXNWxaQ0EvSUg1K1lYSm5kVzFsYm5Seld6RmRJRG9nZEdocGN5NXpZM0p2Ykd4VWIzQmNiaUFnSUNBZ0lDQWdLVHRjYmx4dUlDQWdJQ0FnSUNCeVpYUjFjbTQ3WEc0Z0lDQWdJQ0I5WEc1Y2JpQWdJQ0FnSUhaaGNpQnNaV1owSUQwZ1lYSm5kVzFsYm5Seld6QmRMbXhsWm5RN1hHNGdJQ0FnSUNCMllYSWdkRzl3SUQwZ1lYSm5kVzFsYm5Seld6QmRMblJ2Y0R0Y2JseHVJQ0FnSUNBZ0x5OGdURVZVSUZSSVJTQlRUVTlQVkVoT1JWTlRJRUpGUjBsT0lWeHVJQ0FnSUNBZ2MyMXZiM1JvVTJOeWIyeHNMbU5oYkd3b1hHNGdJQ0FnSUNBZ0lIUm9hWE1zWEc0Z0lDQWdJQ0FnSUhSb2FYTXNYRzRnSUNBZ0lDQWdJSFI1Y0dWdlppQnNaV1owSUQwOVBTQW5kVzVrWldacGJtVmtKeUEvSUhSb2FYTXVjMk55YjJ4c1RHVm1kQ0E2SUg1K2JHVm1kQ3hjYmlBZ0lDQWdJQ0FnZEhsd1pXOW1JSFJ2Y0NBOVBUMGdKM1Z1WkdWbWFXNWxaQ2NnUHlCMGFHbHpMbk5qY205c2JGUnZjQ0E2SUg1K2RHOXdYRzRnSUNBZ0lDQXBPMXh1SUNBZ0lIMDdYRzVjYmlBZ0lDQXZMeUJGYkdWdFpXNTBMbkJ5YjNSdmRIbHdaUzV6WTNKdmJHeENlVnh1SUNBZ0lFVnNaVzFsYm5RdWNISnZkRzkwZVhCbExuTmpjbTlzYkVKNUlEMGdablZ1WTNScGIyNG9LU0I3WEc0Z0lDQWdJQ0F2THlCaGRtOXBaQ0JoWTNScGIyNGdkMmhsYmlCdWJ5QmhjbWQxYldWdWRITWdZWEpsSUhCaGMzTmxaRnh1SUNBZ0lDQWdhV1lnS0dGeVozVnRaVzUwYzFzd1hTQTlQVDBnZFc1a1pXWnBibVZrS1NCN1hHNGdJQ0FnSUNBZ0lISmxkSFZ5Ymp0Y2JpQWdJQ0FnSUgxY2JseHVJQ0FnSUNBZ0x5OGdZWFp2YVdRZ2MyMXZiM1JvSUdKbGFHRjJhVzl5SUdsbUlHNXZkQ0J5WlhGMWFYSmxaRnh1SUNBZ0lDQWdhV1lnS0hOb2IzVnNaRUpoYVd4UGRYUW9ZWEpuZFcxbGJuUnpXekJkS1NBOVBUMGdkSEoxWlNrZ2UxeHVJQ0FnSUNBZ0lDQnZjbWxuYVc1aGJDNWxiR1Z0Wlc1MFUyTnliMnhzTG1OaGJHd29YRzRnSUNBZ0lDQWdJQ0FnZEdocGN5eGNiaUFnSUNBZ0lDQWdJQ0JoY21kMWJXVnVkSE5iTUYwdWJHVm1kQ0FoUFQwZ2RXNWtaV1pwYm1Wa1hHNGdJQ0FnSUNBZ0lDQWdJQ0EvSUg1K1lYSm5kVzFsYm5Seld6QmRMbXhsWm5RZ0t5QjBhR2x6TG5OamNtOXNiRXhsWm5SY2JpQWdJQ0FnSUNBZ0lDQWdJRG9nZm41aGNtZDFiV1Z1ZEhOYk1GMGdLeUIwYUdsekxuTmpjbTlzYkV4bFpuUXNYRzRnSUNBZ0lDQWdJQ0FnWVhKbmRXMWxiblJ6V3pCZExuUnZjQ0FoUFQwZ2RXNWtaV1pwYm1Wa1hHNGdJQ0FnSUNBZ0lDQWdJQ0EvSUg1K1lYSm5kVzFsYm5Seld6QmRMblJ2Y0NBcklIUm9hWE11YzJOeWIyeHNWRzl3WEc0Z0lDQWdJQ0FnSUNBZ0lDQTZJSDUrWVhKbmRXMWxiblJ6V3pGZElDc2dkR2hwY3k1elkzSnZiR3hVYjNCY2JpQWdJQ0FnSUNBZ0tUdGNibHh1SUNBZ0lDQWdJQ0J5WlhSMWNtNDdYRzRnSUNBZ0lDQjlYRzVjYmlBZ0lDQWdJSFJvYVhNdWMyTnliMnhzS0h0Y2JpQWdJQ0FnSUNBZ2JHVm1kRG9nZm41aGNtZDFiV1Z1ZEhOYk1GMHViR1ZtZENBcklIUm9hWE11YzJOeWIyeHNUR1ZtZEN4Y2JpQWdJQ0FnSUNBZ2RHOXdPaUIrZm1GeVozVnRaVzUwYzFzd1hTNTBiM0FnS3lCMGFHbHpMbk5qY205c2JGUnZjQ3hjYmlBZ0lDQWdJQ0FnWW1Wb1lYWnBiM0k2SUdGeVozVnRaVzUwYzFzd1hTNWlaV2hoZG1sdmNseHVJQ0FnSUNBZ2ZTazdYRzRnSUNBZ2ZUdGNibHh1SUNBZ0lDOHZJRVZzWlcxbGJuUXVjSEp2ZEc5MGVYQmxMbk5qY205c2JFbHVkRzlXYVdWM1hHNGdJQ0FnUld4bGJXVnVkQzV3Y205MGIzUjVjR1V1YzJOeWIyeHNTVzUwYjFacFpYY2dQU0JtZFc1amRHbHZiaWdwSUh0Y2JpQWdJQ0FnSUM4dklHRjJiMmxrSUhOdGIyOTBhQ0JpWldoaGRtbHZjaUJwWmlCdWIzUWdjbVZ4ZFdseVpXUmNiaUFnSUNBZ0lHbG1JQ2h6YUc5MWJHUkNZV2xzVDNWMEtHRnlaM1Z0Wlc1MGMxc3dYU2tnUFQwOUlIUnlkV1VwSUh0Y2JpQWdJQ0FnSUNBZ2IzSnBaMmx1WVd3dWMyTnliMnhzU1c1MGIxWnBaWGN1WTJGc2JDaGNiaUFnSUNBZ0lDQWdJQ0IwYUdsekxGeHVJQ0FnSUNBZ0lDQWdJR0Z5WjNWdFpXNTBjMXN3WFNBOVBUMGdkVzVrWldacGJtVmtJRDhnZEhKMVpTQTZJR0Z5WjNWdFpXNTBjMXN3WFZ4dUlDQWdJQ0FnSUNBcE8xeHVYRzRnSUNBZ0lDQWdJSEpsZEhWeWJqdGNiaUFnSUNBZ0lIMWNibHh1SUNBZ0lDQWdMeThnVEVWVUlGUklSU0JUVFU5UFZFaE9SVk5USUVKRlIwbE9JVnh1SUNBZ0lDQWdkbUZ5SUhOamNtOXNiR0ZpYkdWUVlYSmxiblFnUFNCbWFXNWtVMk55YjJ4c1lXSnNaVkJoY21WdWRDaDBhR2x6S1R0Y2JpQWdJQ0FnSUhaaGNpQndZWEpsYm5SU1pXTjBjeUE5SUhOamNtOXNiR0ZpYkdWUVlYSmxiblF1WjJWMFFtOTFibVJwYm1kRGJHbGxiblJTWldOMEtDazdYRzRnSUNBZ0lDQjJZWElnWTJ4cFpXNTBVbVZqZEhNZ1BTQjBhR2x6TG1kbGRFSnZkVzVrYVc1blEyeHBaVzUwVW1WamRDZ3BPMXh1WEc0Z0lDQWdJQ0JwWmlBb2MyTnliMnhzWVdKc1pWQmhjbVZ1ZENBaFBUMGdaQzVpYjJSNUtTQjdYRzRnSUNBZ0lDQWdJQzh2SUhKbGRtVmhiQ0JsYkdWdFpXNTBJR2x1YzJsa1pTQndZWEpsYm5SY2JpQWdJQ0FnSUNBZ2MyMXZiM1JvVTJOeWIyeHNMbU5oYkd3b1hHNGdJQ0FnSUNBZ0lDQWdkR2hwY3l4Y2JpQWdJQ0FnSUNBZ0lDQnpZM0p2Ykd4aFlteGxVR0Z5Wlc1MExGeHVJQ0FnSUNBZ0lDQWdJSE5qY205c2JHRmliR1ZRWVhKbGJuUXVjMk55YjJ4c1RHVm1kQ0FySUdOc2FXVnVkRkpsWTNSekxteGxablFnTFNCd1lYSmxiblJTWldOMGN5NXNaV1owTEZ4dUlDQWdJQ0FnSUNBZ0lITmpjbTlzYkdGaWJHVlFZWEpsYm5RdWMyTnliMnhzVkc5d0lDc2dZMnhwWlc1MFVtVmpkSE11ZEc5d0lDMGdjR0Z5Wlc1MFVtVmpkSE11ZEc5d1hHNGdJQ0FnSUNBZ0lDazdYRzVjYmlBZ0lDQWdJQ0FnTHk4Z2NtVjJaV0ZzSUhCaGNtVnVkQ0JwYmlCMmFXVjNjRzl5ZENCMWJteGxjM01nYVhNZ1ptbDRaV1JjYmlBZ0lDQWdJQ0FnYVdZZ0tIY3VaMlYwUTI5dGNIVjBaV1JUZEhsc1pTaHpZM0p2Ykd4aFlteGxVR0Z5Wlc1MEtTNXdiM05wZEdsdmJpQWhQVDBnSjJacGVHVmtKeWtnZTF4dUlDQWdJQ0FnSUNBZ0lIY3VjMk55YjJ4c1Fua29lMXh1SUNBZ0lDQWdJQ0FnSUNBZ2JHVm1kRG9nY0dGeVpXNTBVbVZqZEhNdWJHVm1kQ3hjYmlBZ0lDQWdJQ0FnSUNBZ0lIUnZjRG9nY0dGeVpXNTBVbVZqZEhNdWRHOXdMRnh1SUNBZ0lDQWdJQ0FnSUNBZ1ltVm9ZWFpwYjNJNklDZHpiVzl2ZEdnblhHNGdJQ0FnSUNBZ0lDQWdmU2s3WEc0Z0lDQWdJQ0FnSUgxY2JpQWdJQ0FnSUgwZ1pXeHpaU0I3WEc0Z0lDQWdJQ0FnSUM4dklISmxkbVZoYkNCbGJHVnRaVzUwSUdsdUlIWnBaWGR3YjNKMFhHNGdJQ0FnSUNBZ0lIY3VjMk55YjJ4c1Fua29lMXh1SUNBZ0lDQWdJQ0FnSUd4bFpuUTZJR05zYVdWdWRGSmxZM1J6TG14bFpuUXNYRzRnSUNBZ0lDQWdJQ0FnZEc5d09pQmpiR2xsYm5SU1pXTjBjeTUwYjNBc1hHNGdJQ0FnSUNBZ0lDQWdZbVZvWVhacGIzSTZJQ2R6Ylc5dmRHZ25YRzRnSUNBZ0lDQWdJSDBwTzF4dUlDQWdJQ0FnZlZ4dUlDQWdJSDA3WEc0Z0lIMWNibHh1SUNCcFppQW9kSGx3Wlc5bUlHVjRjRzl5ZEhNZ1BUMDlJQ2R2WW1wbFkzUW5JQ1ltSUhSNWNHVnZaaUJ0YjJSMWJHVWdJVDA5SUNkMWJtUmxabWx1WldRbktTQjdYRzRnSUNBZ0x5OGdZMjl0Ylc5dWFuTmNiaUFnSUNCdGIyUjFiR1V1Wlhod2IzSjBjeUE5SUhzZ2NHOXNlV1pwYkd3NklIQnZiSGxtYVd4c0lIMDdYRzRnSUgwZ1pXeHpaU0I3WEc0Z0lDQWdMeThnWjJ4dlltRnNYRzRnSUNBZ2NHOXNlV1pwYkd3b0tUdGNiaUFnZlZ4dVhHNTlLQ2twTzF4dUlpd2lZMjl1YzNRZ1lYSjBhV05zWlZSbGJYQnNZWFJsSUQwZ1lGeHVYSFE4WVhKMGFXTnNaU0JqYkdGemN6MWNJbUZ5ZEdsamJHVmZYMjkxZEdWeVhDSStYRzVjZEZ4MFBHUnBkaUJqYkdGemN6MWNJbUZ5ZEdsamJHVmZYMmx1Ym1WeVhDSStYRzVjZEZ4MFhIUThaR2wySUdOc1lYTnpQVndpWVhKMGFXTnNaVjlmYUdWaFpHbHVaMXdpUGx4dVhIUmNkRngwWEhROFlTQmpiR0Z6Y3oxY0ltcHpMV1Z1ZEhKNUxYUnBkR3hsWENJK1BDOWhQbHh1WEhSY2RGeDBYSFE4YURJZ1kyeGhjM005WENKaGNuUnBZMnhsTFdobFlXUnBibWRmWDNScGRHeGxYQ0krUEM5b01qNWNibHgwWEhSY2RGeDBQR1JwZGlCamJHRnpjejFjSW1GeWRHbGpiR1V0YUdWaFpHbHVaMTlmYm1GdFpWd2lQbHh1WEhSY2RGeDBYSFJjZER4emNHRnVJR05zWVhOelBWd2lZWEowYVdOc1pTMW9aV0ZrYVc1blgxOXVZVzFsTFMxbWFYSnpkRndpUGp3dmMzQmhiajVjYmx4MFhIUmNkRngwWEhROFlTQmpiR0Z6Y3oxY0ltcHpMV1Z1ZEhKNUxXRnlkR2x6ZEZ3aVBqd3ZZVDVjYmx4MFhIUmNkRngwWEhROGMzQmhiaUJqYkdGemN6MWNJbUZ5ZEdsamJHVXRhR1ZoWkdsdVoxOWZibUZ0WlMwdGJHRnpkRndpUGp3dmMzQmhiajVjYmx4MFhIUmNkRngwUEM5a2FYWStYRzVjZEZ4MFhIUThMMlJwZGo1Y2RGeHVYSFJjZEZ4MFBHUnBkaUJqYkdGemN6MWNJbUZ5ZEdsamJHVmZYM05zYVdSbGNpMXZkWFJsY2x3aVBseHVYSFJjZEZ4MFhIUThaR2wySUdOc1lYTnpQVndpWVhKMGFXTnNaVjlmYzJ4cFpHVnlMV2x1Ym1WeVhDSStQQzlrYVhZK1hHNWNkRngwWEhSY2REeGthWFlnWTJ4aGMzTTlYQ0poY25ScFkyeGxYMTl6WTNKdmJHd3RZMjl1ZEhKdmJITmNJajVjYmx4MFhIUmNkRngwWEhROGMzQmhiaUJqYkdGemN6MWNJbU52Ym5SeWIyeHpJR0Z5Y205M0xYQnlaWFpjSWo3aWhwQThMM053WVc0K0lGeHVYSFJjZEZ4MFhIUmNkRHh6Y0dGdUlHTnNZWE56UFZ3aVkyOXVkSEp2YkhNZ1lYSnliM2N0Ym1WNGRGd2lQdUtHa2p3dmMzQmhiajVjYmx4MFhIUmNkRngwUEM5a2FYWStYRzVjZEZ4MFhIUmNkRHh3SUdOc1lYTnpQVndpYW5NdFlYSjBhV05zWlMxaGJtTm9iM0l0ZEdGeVoyVjBYQ0krUEM5d1BseHVYSFJjZER3dlpHbDJQbHh1WEhROEwyRnlkR2xqYkdVK1hHNWdPMXh1WEc1bGVIQnZjblFnWkdWbVlYVnNkQ0JoY25ScFkyeGxWR1Z0Y0d4aGRHVTdJaXdpYVcxd2IzSjBJSE50YjI5MGFITmpjbTlzYkNCbWNtOXRJQ2R6Ylc5dmRHaHpZM0p2Ykd3dGNHOXNlV1pwYkd3bk8xeHVYRzVwYlhCdmNuUWdibUYyVEdjZ1puSnZiU0FuTGk5dVlYWXRiR2NuTzF4dWFXMXdiM0owSUdGeWRHbGpiR1ZVWlcxd2JHRjBaU0JtY205dElDY3VMMkZ5ZEdsamJHVXRkR1Z0Y0d4aGRHVW5PMXh1YVcxd2IzSjBJSHNnWkdWaWIzVnVZMlVnZlNCbWNtOXRJQ2N1TDNWMGFXeHpKenRjYmx4dVhHNWpiMjV6ZENCRVFpQTlJQ2RvZEhSd2N6b3ZMMjVsZUhWekxXTmhkR0ZzYjJjdVptbHlaV0poYzJWcGJ5NWpiMjB2Y0c5emRITXVhbk52Ymo5aGRYUm9QVGRuTjNCNVMwdDVhMDR6VGpWbGQzSkpiV2hQWVZNMmRuZHlSbk5qTldaTGEzSnJPR1ZxZW1Zbk8xeHVZMjl1YzNRZ1lXeHdhR0ZpWlhRZ1BTQmJKMkVuTENBbllpY3NJQ2RqSnl3Z0oyUW5MQ0FuWlNjc0lDZG1KeXdnSjJjbkxDQW5hQ2NzSUNkcEp5d2dKMm9uTENBbmF5Y3NJQ2RzSnl3Z0oyMG5MQ0FuYmljc0lDZHZKeXdnSjNBbkxDQW5jaWNzSUNkekp5d2dKM1FuTENBbmRTY3NJQ2QySnl3Z0ozY25MQ0FuZVNjc0lDZDZKMTA3WEc1Y2JtTnZibk4wSUNSc2IyRmthVzVuSUQwZ1FYSnlZWGt1Wm5KdmJTaGtiMk4xYldWdWRDNXhkV1Z5ZVZObGJHVmpkRzl5UVd4c0tDY3ViRzloWkdsdVp5Y3BLVHRjYm1OdmJuTjBJQ1J1WVhZZ1BTQmtiMk4xYldWdWRDNW5aWFJGYkdWdFpXNTBRbmxKWkNnbmFuTXRibUYySnlrN1hHNWpiMjV6ZENBa2NHRnlZV3hzWVhnZ1BTQmtiMk4xYldWdWRDNXhkV1Z5ZVZObGJHVmpkRzl5S0NjdWNHRnlZV3hzWVhnbktUdGNibU52Ym5OMElDUmpiMjUwWlc1MElEMGdaRzlqZFcxbGJuUXVjWFZsY25sVFpXeGxZM1J2Y2lnbkxtTnZiblJsYm5RbktUdGNibU52Ym5OMElDUjBhWFJzWlNBOUlHUnZZM1Z0Wlc1MExtZGxkRVZzWlcxbGJuUkNlVWxrS0NkcWN5MTBhWFJzWlNjcE8xeHVZMjl1YzNRZ0pHRnljbTkzSUQwZ1pHOWpkVzFsYm5RdWNYVmxjbmxUWld4bFkzUnZjaWduTG1GeWNtOTNKeWs3WEc1amIyNXpkQ0FrYlc5a1lXd2dQU0JrYjJOMWJXVnVkQzV4ZFdWeWVWTmxiR1ZqZEc5eUtDY3ViVzlrWVd3bktUdGNibU52Ym5OMElDUnNhV2RvZEdKdmVDQTlJR1J2WTNWdFpXNTBMbkYxWlhKNVUyVnNaV04wYjNJb0p5NXNhV2RvZEdKdmVDY3BPMXh1WTI5dWMzUWdKSFpwWlhjZ1BTQmtiMk4xYldWdWRDNXhkV1Z5ZVZObGJHVmpkRzl5S0NjdWJHbG5hSFJpYjNndGRtbGxkeWNwTzF4dVhHNXNaWFFnYzI5eWRFdGxlU0E5SURBN0lDOHZJREFnUFNCaGNuUnBjM1FzSURFZ1BTQjBhWFJzWlZ4dWJHVjBJR1Z1ZEhKcFpYTWdQU0I3SUdKNVFYVjBhRzl5T2lCYlhTd2dZbmxVYVhSc1pUb2dXMTBnZlR0Y2JteGxkQ0JqZFhKeVpXNTBUR1YwZEdWeUlEMGdKMEVuTzF4dVhHNXNaWFFnYkdsbmFIUmliM2dnUFNCbVlXeHpaVHRjYm14bGRDQjRNaUE5SUdaaGJITmxPMXh1WTI5dWMzUWdZWFIwWVdOb1NXMWhaMlZNYVhOMFpXNWxjbk1nUFNBb0tTQTlQaUI3WEc1Y2RHTnZibk4wSUNScGJXRm5aWE1nUFNCQmNuSmhlUzVtY205dEtHUnZZM1Z0Wlc1MExuRjFaWEo1VTJWc1pXTjBiM0pCYkd3b0p5NWhjblJwWTJ4bExXbHRZV2RsSnlrcE8xeHVYRzVjZENScGJXRm5aWE11Wm05eVJXRmphQ2hwYldjZ1BUNGdlMXh1WEhSY2RHbHRaeTVoWkdSRmRtVnVkRXhwYzNSbGJtVnlLQ2RqYkdsamF5Y3NJQ2hsZG5RcElEMCtJSHRjYmx4MFhIUmNkR2xtSUNnaGJHbG5hSFJpYjNncElIdGNibHgwWEhSY2RGeDBiR1YwSUhOeVl5QTlJR2x0Wnk1emNtTTdYRzVjZEZ4MFhIUmNkRnh1WEhSY2RGeDBYSFFrYkdsbmFIUmliM2d1WTJ4aGMzTk1hWE4wTG1Ga1pDZ25jMmh2ZHkxcGJXY25LVHRjYmx4MFhIUmNkRngwSkhacFpYY3VjMlYwUVhSMGNtbGlkWFJsS0NkemRIbHNaU2NzSUdCaVlXTnJaM0p2ZFc1a0xXbHRZV2RsT2lCMWNtd29KSHR6Y21OOUtXQXBPMXh1WEhSY2RGeDBYSFJzYVdkb2RHSnZlQ0E5SUhSeWRXVTdYRzVjZEZ4MFhIUjlYRzVjZEZ4MGZTazdYRzVjZEgwcE8xeHVYRzVjZENSMmFXVjNMbUZrWkVWMlpXNTBUR2x6ZEdWdVpYSW9KMk5zYVdOckp5d2dLQ2tnUFQ0Z2UxeHVYSFJjZEdsbUlDaHNhV2RvZEdKdmVDa2dlMXh1WEhSY2RGeDBKR3hwWjJoMFltOTRMbU5zWVhOelRHbHpkQzV5WlcxdmRtVW9KM05vYjNjdGFXMW5KeWs3WEc1Y2RGeDBYSFJzYVdkb2RHSnZlQ0E5SUdaaGJITmxPMXh1WEhSY2RIMWNibHgwZlNrN1hHNTlPMXh1WEc1c1pYUWdiVzlrWVd3Z1BTQm1ZV3h6WlR0Y2JtTnZibk4wSUdGMGRHRmphRTF2WkdGc1RHbHpkR1Z1WlhKeklEMGdLQ2tnUFQ0Z2UxeHVYSFJqYjI1emRDQWtabWx1WkNBOUlHUnZZM1Z0Wlc1MExtZGxkRVZzWlcxbGJuUkNlVWxrS0NkcWN5MW1hVzVrSnlrN1hHNWNkRnh1WEhRa1ptbHVaQzVoWkdSRmRtVnVkRXhwYzNSbGJtVnlLQ2RqYkdsamF5Y3NJQ2dwSUQwK0lIdGNibHgwWEhRa2JXOWtZV3d1WTJ4aGMzTk1hWE4wTG1Ga1pDZ25jMmh2ZHljcE8xeHVYSFJjZEcxdlpHRnNJRDBnZEhKMVpUdGNibHgwZlNrN1hHNWNibHgwSkcxdlpHRnNMbUZrWkVWMlpXNTBUR2x6ZEdWdVpYSW9KMk5zYVdOckp5d2dLQ2tnUFQ0Z2UxeHVYSFJjZENSdGIyUmhiQzVqYkdGemMweHBjM1F1Y21WdGIzWmxLQ2R6YUc5M0p5azdYRzVjZEZ4MGJXOWtZV3dnUFNCbVlXeHpaVHRjYmx4MGZTazdYRzVjYmx4MGQybHVaRzkzTG1Ga1pFVjJaVzUwVEdsemRHVnVaWElvSjJ0bGVXUnZkMjRuTENBb0tTQTlQaUI3WEc1Y2RGeDBhV1lnS0cxdlpHRnNLU0I3WEc1Y2RGeDBYSFJ6WlhSVWFXMWxiM1YwS0NncElEMCtJSHRjYmx4MFhIUmNkRngwSkcxdlpHRnNMbU5zWVhOelRHbHpkQzV5WlcxdmRtVW9KM05vYjNjbktUdGNibHgwWEhSY2RGeDBiVzlrWVd3Z1BTQm1ZV3h6WlR0Y2JseDBYSFJjZEgwc0lEWXdNQ2s3WEc1Y2RGeDBmVHRjYmx4MGZTazdYRzU5WEc1Y2JtTnZibk4wSUhOamNtOXNiRlJ2Vkc5d0lEMGdLQ2tnUFQ0Z2UxeHVYSFJzWlhRZ2RHaHBibWNnUFNCa2IyTjFiV1Z1ZEM1blpYUkZiR1Z0Wlc1MFFubEpaQ2duWVc1amFHOXlMWFJoY21kbGRDY3BPMXh1WEhSMGFHbHVaeTV6WTNKdmJHeEpiblJ2Vm1sbGR5aDdZbVZvWVhacGIzSTZJRndpYzIxdmIzUm9YQ0lzSUdKc2IyTnJPaUJjSW5OMFlYSjBYQ0o5S1R0Y2JuMWNibHh1YkdWMElIQnlaWFk3WEc1c1pYUWdZM1Z5Y21WdWRDQTlJREE3WEc1c1pYUWdhWE5UYUc5M2FXNW5JRDBnWm1Gc2MyVTdYRzVqYjI1emRDQmhkSFJoWTJoQmNuSnZkMHhwYzNSbGJtVnljeUE5SUNncElEMCtJSHRjYmx4MEpHRnljbTkzTG1Ga1pFVjJaVzUwVEdsemRHVnVaWElvSjJOc2FXTnJKeXdnS0NrZ1BUNGdlMXh1WEhSY2RITmpjbTlzYkZSdlZHOXdLQ2s3WEc1Y2RIMHBPMXh1WEc1Y2RDUndZWEpoYkd4aGVDNWhaR1JGZG1WdWRFeHBjM1JsYm1WeUtDZHpZM0p2Ykd3bkxDQW9LU0E5UGlCN1hHNWNibHgwWEhSc1pYUWdlU0E5SUNSMGFYUnNaUzVuWlhSQ2IzVnVaR2x1WjBOc2FXVnVkRkpsWTNRb0tTNTVPMXh1WEhSY2RHbG1JQ2hqZFhKeVpXNTBJQ0U5UFNCNUtTQjdYRzVjZEZ4MFhIUndjbVYySUQwZ1kzVnljbVZ1ZER0Y2JseDBYSFJjZEdOMWNuSmxiblFnUFNCNU8xeHVYSFJjZEgxY2JseHVYSFJjZEdsbUlDaDVJRHc5SUMwMU1DQW1KaUFoYVhOVGFHOTNhVzVuS1NCN1hHNWNkRngwWEhRa1lYSnliM2N1WTJ4aGMzTk1hWE4wTG1Ga1pDZ25jMmh2ZHljcE8xeHVYSFJjZEZ4MGFYTlRhRzkzYVc1bklEMGdkSEoxWlR0Y2JseDBYSFI5SUdWc2MyVWdhV1lnS0hrZ1BpQXROVEFnSmlZZ2FYTlRhRzkzYVc1bktTQjdYRzVjZEZ4MFhIUWtZWEp5YjNjdVkyeGhjM05NYVhOMExuSmxiVzkyWlNnbmMyaHZkeWNwTzF4dVhIUmNkRngwYVhOVGFHOTNhVzVuSUQwZ1ptRnNjMlU3WEc1Y2RGeDBmVnh1WEhSOUtUdGNibjA3WEc1Y2JtTnZibk4wSUdGa1pGTnZjblJDZFhSMGIyNU1hWE4wWlc1bGNuTWdQU0FvS1NBOVBpQjdYRzVjZEd4bGRDQWtZbmxCY25ScGMzUWdQU0JrYjJOMWJXVnVkQzVuWlhSRmJHVnRaVzUwUW5sSlpDZ25hbk10WW5rdFlYSjBhWE4wSnlrN1hHNWNkR3hsZENBa1lubFVhWFJzWlNBOUlHUnZZM1Z0Wlc1MExtZGxkRVZzWlcxbGJuUkNlVWxrS0NkcWN5MWllUzEwYVhSc1pTY3BPMXh1WEhRa1lubEJjblJwYzNRdVlXUmtSWFpsYm5STWFYTjBaVzVsY2lnblkyeHBZMnNuTENBb0tTQTlQaUI3WEc1Y2RGeDBhV1lnS0hOdmNuUkxaWGtwSUh0Y2JseDBYSFJjZEhOamNtOXNiRlJ2Vkc5d0tDazdYRzVjZEZ4MFhIUnpiM0owUzJWNUlEMGdNRHRjYmx4MFhIUmNkQ1JpZVVGeWRHbHpkQzVqYkdGemMweHBjM1F1WVdSa0tDZGhZM1JwZG1VbktUdGNibHgwWEhSY2RDUmllVlJwZEd4bExtTnNZWE56VEdsemRDNXlaVzF2ZG1Vb0oyRmpkR2wyWlNjcE8xeHVYRzVjZEZ4MFhIUnlaVzVrWlhKRmJuUnlhV1Z6S0NrN1hHNWNkRngwZlZ4dVhIUjlLVHRjYmx4dVhIUWtZbmxVYVhSc1pTNWhaR1JGZG1WdWRFeHBjM1JsYm1WeUtDZGpiR2xqYXljc0lDZ3BJRDArSUh0Y2JseDBYSFJwWmlBb0lYTnZjblJMWlhrcElIdGNibHgwWEhSY2RITmpjbTlzYkZSdlZHOXdLQ2s3WEc1Y2RGeDBYSFJ6YjNKMFMyVjVJRDBnTVR0Y2JseDBYSFJjZENSaWVWUnBkR3hsTG1Oc1lYTnpUR2x6ZEM1aFpHUW9KMkZqZEdsMlpTY3BPMXh1WEhSY2RGeDBKR0o1UVhKMGFYTjBMbU5zWVhOelRHbHpkQzV5WlcxdmRtVW9KMkZqZEdsMlpTY3BPMXh1WEc1Y2RGeDBYSFJ5Wlc1a1pYSkZiblJ5YVdWektDazdYRzVjZEZ4MGZWeHVYSFI5S1R0Y2JuMDdYRzVjYm1OdmJuTjBJR05zWldGeVFXNWphRzl5Y3lBOUlDaHdjbVYyVTJWc1pXTjBiM0lwSUQwK0lIdGNibHgwYkdWMElDUmxiblJ5YVdWeklEMGdRWEp5WVhrdVpuSnZiU2hrYjJOMWJXVnVkQzV4ZFdWeWVWTmxiR1ZqZEc5eVFXeHNLSEJ5WlhaVFpXeGxZM1J2Y2lrcE8xeHVYSFFrWlc1MGNtbGxjeTVtYjNKRllXTm9LR1Z1ZEhKNUlEMCtJR1Z1ZEhKNUxuSmxiVzkyWlVGMGRISnBZblYwWlNnbmJtRnRaU2NwS1R0Y2JuMDdYRzVjYm1OdmJuTjBJR1pwYm1SR2FYSnpkRVZ1ZEhKNUlEMGdLR05vWVhJcElEMCtJSHRjYmx4MGJHVjBJSE5sYkdWamRHOXlJRDBnYzI5eWRFdGxlU0EvSUNjdWFuTXRaVzUwY25rdGRHbDBiR1VuSURvZ0p5NXFjeTFsYm5SeWVTMWhjblJwYzNRbk8xeHVYSFJzWlhRZ2NISmxkbE5sYkdWamRHOXlJRDBnSVhOdmNuUkxaWGtnUHlBbkxtcHpMV1Z1ZEhKNUxYUnBkR3hsSnlBNklDY3Vhbk10Wlc1MGNua3RZWEowYVhOMEp6dGNibHgwYkdWMElDUmxiblJ5YVdWeklEMGdRWEp5WVhrdVpuSnZiU2hrYjJOMWJXVnVkQzV4ZFdWeWVWTmxiR1ZqZEc5eVFXeHNLSE5sYkdWamRHOXlLU2s3WEc1Y2JseDBZMnhsWVhKQmJtTm9iM0p6S0hCeVpYWlRaV3hsWTNSdmNpazdYRzVjYmx4MGNtVjBkWEp1SUNSbGJuUnlhV1Z6TG1acGJtUW9aVzUwY25rZ1BUNGdlMXh1WEhSY2RHeGxkQ0J1YjJSbElEMGdaVzUwY25rdWJtVjRkRVZzWlcxbGJuUlRhV0pzYVc1bk8xeHVYSFJjZEhKbGRIVnliaUJ1YjJSbExtbHVibVZ5U0ZSTlRGc3dYU0E5UFQwZ1kyaGhjaUI4ZkNCdWIyUmxMbWx1Ym1WeVNGUk5URnN3WFNBOVBUMGdZMmhoY2k1MGIxVndjR1Z5UTJGelpTZ3BPMXh1WEhSOUtUdGNibjA3WEc1Y2JseHVZMjl1YzNRZ2JXRnJaVUZzY0doaFltVjBJRDBnS0NrZ1BUNGdlMXh1WEhSamIyNXpkQ0JoZEhSaFkyaEJibU5vYjNKTWFYTjBaVzVsY2lBOUlDZ2tZVzVqYUc5eUxDQnNaWFIwWlhJcElEMCtJSHRjYmx4MFhIUWtZVzVqYUc5eUxtRmtaRVYyWlc1MFRHbHpkR1Z1WlhJb0oyTnNhV05ySnl3Z0tDa2dQVDRnZTF4dVhIUmNkRngwWTI5dWMzUWdiR1YwZEdWeVRtOWtaU0E5SUdSdlkzVnRaVzUwTG1kbGRFVnNaVzFsYm5SQ2VVbGtLR3hsZEhSbGNpazdYRzVjZEZ4MFhIUnNaWFFnZEdGeVoyVjBPMXh1WEc1Y2RGeDBYSFJwWmlBb0lYTnZjblJMWlhrcElIdGNibHgwWEhSY2RGeDBkR0Z5WjJWMElEMGdiR1YwZEdWeUlEMDlQU0FuWVNjZ1B5QmtiMk4xYldWdWRDNW5aWFJGYkdWdFpXNTBRbmxKWkNnbllXNWphRzl5TFhSaGNtZGxkQ2NwSURvZ2JHVjBkR1Z5VG05a1pTNXdZWEpsYm5SRmJHVnRaVzUwTG5CaGNtVnVkRVZzWlcxbGJuUXVjR0Z5Wlc1MFJXeGxiV1Z1ZEM1d1lYSmxiblJGYkdWdFpXNTBMbkJ5WlhacGIzVnpSV3hsYldWdWRGTnBZbXhwYm1jdWNYVmxjbmxUWld4bFkzUnZjaWduTG1wekxXRnlkR2xqYkdVdFlXNWphRzl5TFhSaGNtZGxkQ2NwTzF4dVhIUmNkRngwZlNCbGJITmxJSHRjYmx4MFhIUmNkRngwZEdGeVoyVjBJRDBnYkdWMGRHVnlJRDA5UFNBbllTY2dQeUJrYjJOMWJXVnVkQzVuWlhSRmJHVnRaVzUwUW5sSlpDZ25ZVzVqYUc5eUxYUmhjbWRsZENjcElEb2diR1YwZEdWeVRtOWtaUzV3WVhKbGJuUkZiR1Z0Wlc1MExuQmhjbVZ1ZEVWc1pXMWxiblF1Y0dGeVpXNTBSV3hsYldWdWRDNXdjbVYyYVc5MWMwVnNaVzFsYm5SVGFXSnNhVzVuTG5GMVpYSjVVMlZzWldOMGIzSW9KeTVxY3kxaGNuUnBZMnhsTFdGdVkyaHZjaTEwWVhKblpYUW5LVHRjYmx4MFhIUmNkSDA3WEc1Y2JseDBYSFJjZEhSaGNtZGxkQzV6WTNKdmJHeEpiblJ2Vm1sbGR5aDdZbVZvWVhacGIzSTZJRndpYzIxdmIzUm9YQ0lzSUdKc2IyTnJPaUJjSW5OMFlYSjBYQ0o5S1R0Y2JseDBYSFI5S1R0Y2JseDBmVHRjYmx4dVhIUnNaWFFnWVdOMGFYWmxSVzUwY21sbGN5QTlJSHQ5TzF4dVhIUnNaWFFnSkc5MWRHVnlJRDBnWkc5amRXMWxiblF1Y1hWbGNubFRaV3hsWTNSdmNpZ25MbUZzY0doaFltVjBYMTlzWlhSMFpYSnpKeWs3WEc1Y2RDUnZkWFJsY2k1cGJtNWxja2hVVFV3Z1BTQW5KenRjYmx4dVhIUmhiSEJvWVdKbGRDNW1iM0pGWVdOb0tHeGxkSFJsY2lBOVBpQjdYRzVjZEZ4MGJHVjBJQ1JtYVhKemRFVnVkSEo1SUQwZ1ptbHVaRVpwY25OMFJXNTBjbmtvYkdWMGRHVnlLVHRjYmx4MFhIUnNaWFFnSkdGdVkyaHZjaUE5SUdSdlkzVnRaVzUwTG1OeVpXRjBaVVZzWlcxbGJuUW9KMkVuS1R0Y2JseHVYSFJjZEdsbUlDZ2hKR1pwY25OMFJXNTBjbmtwSUhKbGRIVnlianRjYmx4dVhIUmNkQ1JtYVhKemRFVnVkSEo1TG1sa0lEMGdiR1YwZEdWeU8xeHVYSFJjZENSaGJtTm9iM0l1YVc1dVpYSklWRTFNSUQwZ2JHVjBkR1Z5TG5SdlZYQndaWEpEWVhObEtDazdYRzVjZEZ4MEpHRnVZMmh2Y2k1amJHRnpjMDVoYldVZ1BTQW5ZV3h3YUdGaVpYUmZYMnhsZEhSbGNpMWhibU5vYjNJbk8xeHVYRzVjZEZ4MFlYUjBZV05vUVc1amFHOXlUR2x6ZEdWdVpYSW9KR0Z1WTJodmNpd2diR1YwZEdWeUtUdGNibHgwWEhRa2IzVjBaWEl1WVhCd1pXNWtRMmhwYkdRb0pHRnVZMmh2Y2lrN1hHNWNkSDBwTzF4dWZUdGNibHh1WTI5dWMzUWdjbVZ1WkdWeVNXMWhaMlZ6SUQwZ0tHbHRZV2RsY3l3Z0pHbHRZV2RsY3lrZ1BUNGdlMXh1WEhScGJXRm5aWE11Wm05eVJXRmphQ2hwYldGblpTQTlQaUI3WEc1Y2RGeDBZMjl1YzNRZ2MzSmpJRDBnWUM0dUx5NHVMMkZ6YzJWMGN5OXBiV0ZuWlhNdkpIdHBiV0ZuWlgxZ08xeHVYSFJjZEdOdmJuTjBJQ1JwYldkUGRYUmxjaUE5SUdSdlkzVnRaVzUwTG1OeVpXRjBaVVZzWlcxbGJuUW9KMlJwZGljcE8xeHVYSFJjZEdOdmJuTjBJQ1JwYldjZ1BTQmtiMk4xYldWdWRDNWpjbVZoZEdWRmJHVnRaVzUwS0NkSlRVY25LVHRjYmx4MFhIUWthVzFuTG1Oc1lYTnpUbUZ0WlNBOUlDZGhjblJwWTJ4bExXbHRZV2RsSnp0Y2JseDBYSFFrYVcxbkxuTnlZeUE5SUhOeVl6dGNibHgwWEhRa2FXMW5UM1YwWlhJdVlYQndaVzVrUTJocGJHUW9KR2x0WnlrN1hHNWNkRngwSkdsdFlXZGxjeTVoY0hCbGJtUkRhR2xzWkNna2FXMW5UM1YwWlhJcE8xeHVYSFI5S1Z4dWZUdGNibHh1WTI5dWMzUWdjbVZ1WkdWeVJXNTBjbWxsY3lBOUlDZ3BJRDArSUh0Y2JseDBZMjl1YzNRZ0pHRnlkR2xqYkdWTWFYTjBJRDBnWkc5amRXMWxiblF1WjJWMFJXeGxiV1Z1ZEVKNVNXUW9KMnB6TFd4cGMzUW5LVHRjYmx4MFkyOXVjM1FnWlc1MGNtbGxjMHhwYzNRZ1BTQnpiM0owUzJWNUlEOGdaVzUwY21sbGN5NWllVlJwZEd4bElEb2daVzUwY21sbGN5NWllVUYxZEdodmNqdGNibHh1WEhRa1lYSjBhV05zWlV4cGMzUXVhVzV1WlhKSVZFMU1JRDBnSnljN1hHNWNibHgwWlc1MGNtbGxjMHhwYzNRdVptOXlSV0ZqYUNobGJuUnllU0E5UGlCN1hHNWNkRngwWTI5dWMzUWdleUIwYVhSc1pTd2diR0Z6ZEU1aGJXVXNJR1pwY25OMFRtRnRaU3dnYVcxaFoyVnpMQ0JrWlhOamNtbHdkR2x2Yml3Z1pHVjBZV2xzSUgwZ1BTQmxiblJ5ZVR0Y2JseHVYSFJjZENSaGNuUnBZMnhsVEdsemRDNXBibk5sY25SQlpHcGhZMlZ1ZEVoVVRVd29KMkpsWm05eVpXVnVaQ2NzSUdGeWRHbGpiR1ZVWlcxd2JHRjBaU2s3WEc1Y2JseDBYSFJqYjI1emRDQWtZV3hzVTJ4cFpHVnljeUE5SUdSdlkzVnRaVzUwTG5GMVpYSjVVMlZzWldOMGIzSkJiR3dvSnk1aGNuUnBZMnhsWDE5emJHbGtaWEl0YVc1dVpYSW5LVHRjYmx4MFhIUmpiMjV6ZENBa2MyeHBaR1Z5SUQwZ0pHRnNiRk5zYVdSbGNuTmJKR0ZzYkZOc2FXUmxjbk11YkdWdVozUm9JQzBnTVYwN1hHNWNkRngwTHk4Z1kyOXVjM1FnSkdsdFlXZGxjeUE5SUNSemJHbGtaWEl1Y1hWbGNubFRaV3hsWTNSdmNpZ25MbUZ5ZEdsamJHVmZYMmx0WVdkbGN5Y3BPMXh1WEc1Y2RGeDBhV1lnS0dsdFlXZGxjeTVzWlc1bmRHZ3BJSEpsYm1SbGNrbHRZV2RsY3locGJXRm5aWE1zSUNSemJHbGtaWElwTzF4dVhIUmNkRnh1WEhSY2RHTnZibk4wSUNSa1pYTmpjbWx3ZEdsdmJrOTFkR1Z5SUQwZ1pHOWpkVzFsYm5RdVkzSmxZWFJsUld4bGJXVnVkQ2duWkdsMkp5azdYRzVjZEZ4MFkyOXVjM1FnSkdSbGMyTnlhWEIwYVc5dVRtOWtaU0E5SUdSdlkzVnRaVzUwTG1OeVpXRjBaVVZzWlcxbGJuUW9KM0FuS1R0Y2JseDBYSFJqYjI1emRDQWtaR1YwWVdsc1RtOWtaU0E5SUdSdlkzVnRaVzUwTG1OeVpXRjBaVVZzWlcxbGJuUW9KM0FuS1R0Y2JseDBYSFFrWkdWelkzSnBjSFJwYjI1UGRYUmxjaTVqYkdGemMweHBjM1F1WVdSa0tDZGhjblJwWTJ4bExXUmxjMk55YVhCMGFXOXVYMTl2ZFhSbGNpY3BPMXh1WEhSY2RDUmtaWE5qY21sd2RHbHZiazV2WkdVdVkyeGhjM05NYVhOMExtRmtaQ2duWVhKMGFXTnNaUzFrWlhOamNtbHdkR2x2YmljcE8xeHVYSFJjZENSa1pYUmhhV3hPYjJSbExtTnNZWE56VEdsemRDNWhaR1FvSjJGeWRHbGpiR1V0WkdWMFlXbHNKeWs3WEc1Y2JseDBYSFFrWkdWelkzSnBjSFJwYjI1T2IyUmxMbWx1Ym1WeVNGUk5UQ0E5SUdSbGMyTnlhWEIwYVc5dU8xeHVYSFJjZENSa1pYUmhhV3hPYjJSbExtbHVibVZ5U0ZSTlRDQTlJR1JsZEdGcGJEdGNibHh1WEhSY2RDUmtaWE5qY21sd2RHbHZiazkxZEdWeUxtRndjR1Z1WkVOb2FXeGtLQ1JrWlhOamNtbHdkR2x2Yms1dlpHVXNJQ1JrWlhSaGFXeE9iMlJsS1R0Y2JseDBYSFFrYzJ4cFpHVnlMbUZ3Y0dWdVpFTm9hV3hrS0NSa1pYTmpjbWx3ZEdsdmJrOTFkR1Z5S1R0Y2JseHVYSFJjZEdOdmJuTjBJQ1IwYVhSc1pVNXZaR1Z6SUQwZ1pHOWpkVzFsYm5RdWNYVmxjbmxUWld4bFkzUnZja0ZzYkNnbkxtRnlkR2xqYkdVdGFHVmhaR2x1WjE5ZmRHbDBiR1VuS1R0Y2JseDBYSFJqYjI1emRDQWtkR2wwYkdVZ1BTQWtkR2wwYkdWT2IyUmxjMXNrZEdsMGJHVk9iMlJsY3k1c1pXNW5kR2dnTFNBeFhUdGNibHh1WEhSY2RHTnZibk4wSUNSbWFYSnpkRTV2WkdWeklEMGdaRzlqZFcxbGJuUXVjWFZsY25sVFpXeGxZM1J2Y2tGc2JDZ25MbUZ5ZEdsamJHVXRhR1ZoWkdsdVoxOWZibUZ0WlMwdFptbHljM1FuS1R0Y2JseDBYSFJqYjI1emRDQWtabWx5YzNRZ1BTQWtabWx5YzNST2IyUmxjMXNrWm1seWMzUk9iMlJsY3k1c1pXNW5kR2dnTFNBeFhUdGNibHh1WEhSY2RHTnZibk4wSUNSc1lYTjBUbTlrWlhNZ1BTQmtiMk4xYldWdWRDNXhkV1Z5ZVZObGJHVmpkRzl5UVd4c0tDY3VZWEowYVdOc1pTMW9aV0ZrYVc1blgxOXVZVzFsTFMxc1lYTjBKeWs3WEc1Y2RGeDBZMjl1YzNRZ0pHeGhjM1FnUFNBa2JHRnpkRTV2WkdWeld5UnNZWE4wVG05a1pYTXViR1Z1WjNSb0lDMGdNVjA3WEc1Y2JseDBYSFFrZEdsMGJHVXVhVzV1WlhKSVZFMU1JRDBnZEdsMGJHVTdYRzVjZEZ4MEpHWnBjbk4wTG1sdWJtVnlTRlJOVENBOUlHWnBjbk4wVG1GdFpUdGNibHgwWEhRa2JHRnpkQzVwYm01bGNraFVUVXdnUFNCc1lYTjBUbUZ0WlR0Y2JseHVYSFJjZEdOdmJuTjBJQ1JoY25KdmQwNWxlSFFnUFNBa2MyeHBaR1Z5TG5CaGNtVnVkRVZzWlcxbGJuUXVjWFZsY25sVFpXeGxZM1J2Y2lnbkxtRnljbTkzTFc1bGVIUW5LVHRjYmx4MFhIUmpiMjV6ZENBa1lYSnliM2RRY21WMklEMGdKSE5zYVdSbGNpNXdZWEpsYm5SRmJHVnRaVzUwTG5GMVpYSjVVMlZzWldOMGIzSW9KeTVoY25KdmR5MXdjbVYySnlrN1hHNWNibHgwWEhSc1pYUWdZM1Z5Y21WdWRDQTlJQ1J6Ykdsa1pYSXVabWx5YzNSRmJHVnRaVzUwUTJocGJHUTdYRzVjZEZ4MEpHRnljbTkzVG1WNGRDNWhaR1JGZG1WdWRFeHBjM1JsYm1WeUtDZGpiR2xqYXljc0lDZ3BJRDArSUh0Y2JseDBYSFJjZEdOdmJuTjBJRzVsZUhRZ1BTQmpkWEp5Wlc1MExtNWxlSFJGYkdWdFpXNTBVMmxpYkdsdVp6dGNibHgwWEhSY2RHbG1JQ2h1WlhoMEtTQjdYRzVjZEZ4MFhIUmNkRzVsZUhRdWMyTnliMnhzU1c1MGIxWnBaWGNvZTJKbGFHRjJhVzl5T2lCY0luTnRiMjkwYUZ3aUxDQmliRzlqYXpvZ1hDSnVaV0Z5WlhOMFhDSXNJR2x1YkdsdVpUb2dYQ0pqWlc1MFpYSmNJbjBwTzF4dVhIUmNkRngwWEhSamRYSnlaVzUwSUQwZ2JtVjRkRHRjYmx4MFhIUmNkSDFjYmx4MFhIUjlLVHRjYmx4dVhIUmNkQ1JoY25KdmQxQnlaWFl1WVdSa1JYWmxiblJNYVhOMFpXNWxjaWduWTJ4cFkyc25MQ0FvS1NBOVBpQjdYRzVjZEZ4MFhIUmpiMjV6ZENCd2NtVjJJRDBnWTNWeWNtVnVkQzV3Y21WMmFXOTFjMFZzWlcxbGJuUlRhV0pzYVc1bk8xeHVYSFJjZEZ4MGFXWWdLSEJ5WlhZcElIdGNibHgwWEhSY2RGeDBjSEpsZGk1elkzSnZiR3hKYm5SdlZtbGxkeWg3WW1Wb1lYWnBiM0k2SUZ3aWMyMXZiM1JvWENJc0lHSnNiMk5yT2lCY0ltNWxZWEpsYzNSY0lpd2dhVzVzYVc1bE9pQmNJbU5sYm5SbGNsd2lmU2s3WEc1Y2RGeDBYSFJjZEdOMWNuSmxiblFnUFNCd2NtVjJPMXh1WEhSY2RGeDBmVnh1WEhSY2RIMHBYRzVjZEgwcE8xeHVYRzVjZEdGMGRHRmphRWx0WVdkbFRHbHpkR1Z1WlhKektDazdYRzVjZEcxaGEyVkJiSEJvWVdKbGRDZ3BPMXh1ZlR0Y2JseHVMeThnZEdocGN5QnVaV1ZrY3lCMGJ5QmlaU0JoSUdSbFpYQmxjaUJ6YjNKMFhHNWpiMjV6ZENCemIzSjBRbmxVYVhSc1pTQTlJQ2dwSUQwK0lIdGNibHgwWlc1MGNtbGxjeTVpZVZScGRHeGxMbk52Y25Rb0tHRXNJR0lwSUQwK0lIdGNibHgwWEhSc1pYUWdZVlJwZEd4bElEMGdZUzUwYVhSc1pWc3dYUzUwYjFWd2NHVnlRMkZ6WlNncE8xeHVYSFJjZEd4bGRDQmlWR2wwYkdVZ1BTQmlMblJwZEd4bFd6QmRMblJ2VlhCd1pYSkRZWE5sS0NrN1hHNWNkRngwYVdZZ0tHRlVhWFJzWlNBK0lHSlVhWFJzWlNrZ2NtVjBkWEp1SURFN1hHNWNkRngwWld4elpTQnBaaUFvWVZScGRHeGxJRHdnWWxScGRHeGxLU0J5WlhSMWNtNGdMVEU3WEc1Y2RGeDBaV3h6WlNCeVpYUjFjbTRnTUR0Y2JseDBmU2s3WEc1OU8xeHVYRzVqYjI1emRDQnpaWFJFWVhSaElEMGdLR1JoZEdFcElEMCtJSHRjYmx4MFpXNTBjbWxsY3k1aWVVRjFkR2h2Y2lBOUlHUmhkR0U3WEc1Y2RHVnVkSEpwWlhNdVlubFVhWFJzWlNBOUlHUmhkR0V1YzJ4cFkyVW9LVHNnTHk4Z1kyOXdhV1Z6SUdSaGRHRWdabTl5SUdKNVZHbDBiR1VnYzI5eWRGeHVYSFJ6YjNKMFFubFVhWFJzWlNncE8xeHVYSFJ5Wlc1a1pYSkZiblJ5YVdWektDazdYRzU5WEc1Y2JtTnZibk4wSUdabGRHTm9SR0YwWVNBOUlDZ3BJRDArSUh0Y2JseDBYSFJtWlhSamFDaEVRaWt1ZEdobGJpaHlaWE1nUFQ1Y2JseDBYSFJjZEhKbGN5NXFjMjl1S0NsY2JseDBYSFFwTG5Sb1pXNG9aR0YwWVNBOVBpQjdYRzVjZEZ4MFhIUnpaWFJFWVhSaEtHUmhkR0VwTzF4dVhIUmNkSDBwWEc1Y2RGeDBMblJvWlc0b0tDa2dQVDRnZTF4dVhIUmNkRngwSkd4dllXUnBibWN1Wm05eVJXRmphQ2hsYkdWdElEMCtJR1ZzWlcwdVkyeGhjM05NYVhOMExtRmtaQ2duY21WaFpIa25LU2s3WEc1Y2RGeDBYSFFrYm1GMkxtTnNZWE56VEdsemRDNWhaR1FvSjNKbFlXUjVKeWs3WEc1Y2RGeDBmU2xjYmx4MFhIUXVZMkYwWTJnb1pYSnlJRDArSUdOdmJuTnZiR1V1ZDJGeWJpaGxjbklwS1R0Y2JuMDdYRzVjYm1OdmJuTjBJR2x1YVhRZ1BTQW9LU0E5UGlCN1hHNWNkSE50YjI5MGFITmpjbTlzYkM1d2IyeDVabWxzYkNncE8xeHVYSFJtWlhSamFFUmhkR0VvS1R0Y2JseDBibUYyVEdjb0tUdGNibHgwY21WdVpHVnlSVzUwY21sbGN5Z3BPMXh1WEhSaFpHUlRiM0owUW5WMGRHOXVUR2x6ZEdWdVpYSnpLQ2s3WEc1Y2RHRjBkR0ZqYUVGeWNtOTNUR2x6ZEdWdVpYSnpLQ2s3WEc1Y2RHRjBkR0ZqYUUxdlpHRnNUR2x6ZEdWdVpYSnpLQ2s3WEc1OVhHNWNibWx1YVhRb0tUdGNiaUlzSW1OdmJuTjBJSFJsYlhCc1lYUmxJRDBnWEc1Y2RHQThaR2wySUdOc1lYTnpQVndpYm1GMlgxOXBibTVsY2x3aVBseHVYSFJjZER4a2FYWWdZMnhoYzNNOVhDSnVZWFpmWDNOdmNuUXRZbmxjSWo1Y2JseDBYSFJjZER4emNHRnVJR05zWVhOelBWd2ljMjl5ZEMxaWVWOWZkR2wwYkdWY0lqNVRiM0owSUdKNVBDOXpjR0Z1UGx4dVhIUmNkRngwUEdKMWRIUnZiaUJqYkdGemN6MWNJbk52Y25RdFlua2djMjl5ZEMxaWVWOWZZbmt0WVhKMGFYTjBJR0ZqZEdsMlpWd2lJR2xrUFZ3aWFuTXRZbmt0WVhKMGFYTjBYQ0krUVhKMGFYTjBQQzlpZFhSMGIyNCtYRzVjZEZ4MFhIUThjM0JoYmlCamJHRnpjejFjSW5OdmNuUXRZbmxmWDJScGRtbGtaWEpjSWo0Z2ZDQThMM053WVc0K1hHNWNkRngwWEhROFluVjBkRzl1SUdOc1lYTnpQVndpYzI5eWRDMWllU0J6YjNKMExXSjVYMTlpZVMxMGFYUnNaVndpSUdsa1BWd2lhbk10WW5rdGRHbDBiR1ZjSWo1VWFYUnNaVHd2WW5WMGRHOXVQbHh1WEhSY2RGeDBQSE53WVc0Z1kyeGhjM005WENKbWFXNWtYQ0lnYVdROVhDSnFjeTFtYVc1a1hDSStYRzVjZEZ4MFhIUmNkQ2c4YzNCaGJpQmpiR0Z6Y3oxY0ltWnBibVF0TFdsdWJtVnlYQ0krSmlNNE9UZzBPMFk4TDNOd1lXNCtLVnh1WEhSY2RGeDBQQzl6Y0dGdVBseHVYSFJjZER3dlpHbDJQbHh1WEhSY2REeGthWFlnWTJ4aGMzTTlYQ0p1WVhaZlgyRnNjR2hoWW1WMFhDSStYRzVjZEZ4MFhIUThjM0JoYmlCamJHRnpjejFjSW1Gc2NHaGhZbVYwWDE5MGFYUnNaVndpUGtkdklIUnZQQzl6Y0dGdVBseHVYSFJjZEZ4MFBHUnBkaUJqYkdGemN6MWNJbUZzY0doaFltVjBYMTlzWlhSMFpYSnpYQ0krUEM5a2FYWStYRzVjZEZ4MFBDOWthWFkrWEc1Y2REd3ZaR2wyUG1BN1hHNWNibU52Ym5OMElHNWhka3huSUQwZ0tDa2dQVDRnZTF4dVhIUnNaWFFnYm1GMlQzVjBaWElnUFNCa2IyTjFiV1Z1ZEM1blpYUkZiR1Z0Wlc1MFFubEpaQ2duYW5NdGJtRjJKeWs3WEc1Y2RHNWhkazkxZEdWeUxtbHVibVZ5U0ZSTlRDQTlJSFJsYlhCc1lYUmxPMXh1ZlR0Y2JseHVaWGh3YjNKMElHUmxabUYxYkhRZ2JtRjJUR2M3SWl3aVkyOXVjM1FnWkdWaWIzVnVZMlVnUFNBb1ptNHNJSFJwYldVcElEMCtJSHRjYmlBZ2JHVjBJSFJwYldWdmRYUTdYRzVjYmlBZ2NtVjBkWEp1SUdaMWJtTjBhVzl1S0NrZ2UxeHVJQ0FnSUdOdmJuTjBJR1oxYm1OMGFXOXVRMkZzYkNBOUlDZ3BJRDArSUdadUxtRndjR3g1S0hSb2FYTXNJR0Z5WjNWdFpXNTBjeWs3WEc0Z0lDQWdYRzRnSUNBZ1kyeGxZWEpVYVcxbGIzVjBLSFJwYldWdmRYUXBPMXh1SUNBZ0lIUnBiV1Z2ZFhRZ1BTQnpaWFJVYVcxbGIzVjBLR1oxYm1OMGFXOXVRMkZzYkN3Z2RHbHRaU2s3WEc0Z0lIMWNibjA3WEc1Y2JtVjRjRzl5ZENCN0lHUmxZbTkxYm1ObElIMDdJbDE5In0=
