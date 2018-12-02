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

var _smoothscrollPolyfill = require('smoothscroll-polyfill');

var _smoothscrollPolyfill2 = _interopRequireDefault(_smoothscrollPolyfill);

var _templates = require('./templates');

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
	(0, _templates.navLg)();
	renderEntries();
	addSortButtonListeners();
	attachArrowListeners();
	attachModalListeners();
};

init();

},{"./templates":4,"./utils":6,"smoothscroll-polyfill":1}],3:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
	value: true
});
var articleTemplate = "\n\t<article class=\"article__outer\">\n\t\t<div class=\"article__inner\">\n\t\t\t<div class=\"article__heading\">\n\t\t\t\t<a class=\"js-entry-title\"></a>\n\t\t\t\t<h2 class=\"article-heading__title\"></h2>\n\t\t\t\t<div class=\"article-heading__name\">\n\t\t\t\t\t<span class=\"article-heading__name--first\"></span>\n\t\t\t\t\t<a class=\"js-entry-artist\"></a>\n\t\t\t\t\t<span class=\"article-heading__name--last\"></span>\n\t\t\t\t</div>\n\t\t\t</div>\t\n\t\t\t<div class=\"article__slider-outer\">\n\t\t\t\t<div class=\"article__slider-inner\"></div>\n\t\t\t\t<div class=\"article__scroll-controls\">\n\t\t\t\t\t<span class=\"controls arrow-prev\">\u2190</span> \n\t\t\t\t\t<span class=\"controls arrow-next\">\u2192</span>\n\t\t\t\t</div>\n\t\t\t\t<p class=\"js-article-anchor-target\"></p>\n\t\t</div>\n\t</article>\n";

exports.default = articleTemplate;

},{}],4:[function(require,module,exports){
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

},{"./article":3,"./navLg":5}],5:[function(require,module,exports){
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

},{}],6:[function(require,module,exports){
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

},{}]},{},[2])

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvc21vb3Roc2Nyb2xsLXBvbHlmaWxsL2Rpc3Qvc21vb3Roc2Nyb2xsLmpzIiwic3JjL2pzL2luZGV4LmpzIiwic3JjL2pzL3RlbXBsYXRlcy9hcnRpY2xlLmpzIiwic3JjL2pzL3RlbXBsYXRlcy9pbmRleC5qcyIsInNyYy9qcy90ZW1wbGF0ZXMvbmF2TGcuanMiLCJzcmMvanMvdXRpbHMvaW5kZXguanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDdmJBOzs7O0FBRUE7O0FBQ0E7Ozs7QUFHQSxJQUFNLEtBQUssK0ZBQVg7QUFDQSxJQUFNLFdBQVcsQ0FBQyxHQUFELEVBQU0sR0FBTixFQUFXLEdBQVgsRUFBZ0IsR0FBaEIsRUFBcUIsR0FBckIsRUFBMEIsR0FBMUIsRUFBK0IsR0FBL0IsRUFBb0MsR0FBcEMsRUFBeUMsR0FBekMsRUFBOEMsR0FBOUMsRUFBbUQsR0FBbkQsRUFBd0QsR0FBeEQsRUFBNkQsR0FBN0QsRUFBa0UsR0FB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Y3Rpb24oKXtmdW5jdGlvbiByKGUsbix0KXtmdW5jdGlvbiBvKGksZil7aWYoIW5baV0pe2lmKCFlW2ldKXt2YXIgYz1cImZ1bmN0aW9uXCI9PXR5cGVvZiByZXF1aXJlJiZyZXF1aXJlO2lmKCFmJiZjKXJldHVybiBjKGksITApO2lmKHUpcmV0dXJuIHUoaSwhMCk7dmFyIGE9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitpK1wiJ1wiKTt0aHJvdyBhLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsYX12YXIgcD1uW2ldPXtleHBvcnRzOnt9fTtlW2ldWzBdLmNhbGwocC5leHBvcnRzLGZ1bmN0aW9uKHIpe3ZhciBuPWVbaV1bMV1bcl07cmV0dXJuIG8obnx8cil9LHAscC5leHBvcnRzLHIsZSxuLHQpfXJldHVybiBuW2ldLmV4cG9ydHN9Zm9yKHZhciB1PVwiZnVuY3Rpb25cIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmUsaT0wO2k8dC5sZW5ndGg7aSsrKW8odFtpXSk7cmV0dXJuIG99cmV0dXJuIHJ9KSgpIiwiLyogc21vb3Roc2Nyb2xsIHYwLjQuMCAtIDIwMTggLSBEdXN0YW4gS2FzdGVuLCBKZXJlbWlhcyBNZW5pY2hlbGxpIC0gTUlUIExpY2Vuc2UgKi9cbihmdW5jdGlvbiAoKSB7XG4gICd1c2Ugc3RyaWN0JztcblxuICAvLyBwb2x5ZmlsbFxuICBmdW5jdGlvbiBwb2x5ZmlsbCgpIHtcbiAgICAvLyBhbGlhc2VzXG4gICAgdmFyIHcgPSB3aW5kb3c7XG4gICAgdmFyIGQgPSBkb2N1bWVudDtcblxuICAgIC8vIHJldHVybiBpZiBzY3JvbGwgYmVoYXZpb3IgaXMgc3VwcG9ydGVkIGFuZCBwb2x5ZmlsbCBpcyBub3QgZm9yY2VkXG4gICAgaWYgKFxuICAgICAgJ3Njcm9sbEJlaGF2aW9yJyBpbiBkLmRvY3VtZW50RWxlbWVudC5zdHlsZSAmJlxuICAgICAgdy5fX2ZvcmNlU21vb3RoU2Nyb2xsUG9seWZpbGxfXyAhPT0gdHJ1ZVxuICAgICkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIC8vIGdsb2JhbHNcbiAgICB2YXIgRWxlbWVudCA9IHcuSFRNTEVsZW1lbnQgfHwgdy5FbGVtZW50O1xuICAgIHZhciBTQ1JPTExfVElNRSA9IDQ2ODtcblxuICAgIC8vIG9iamVjdCBnYXRoZXJpbmcgb3JpZ2luYWwgc2Nyb2xsIG1ldGhvZHNcbiAgICB2YXIgb3JpZ2luYWwgPSB7XG4gICAgICBzY3JvbGw6IHcuc2Nyb2xsIHx8IHcuc2Nyb2xsVG8sXG4gICAgICBzY3JvbGxCeTogdy5zY3JvbGxCeSxcbiAgICAgIGVsZW1lbnRTY3JvbGw6IEVsZW1lbnQucHJvdG90eXBlLnNjcm9sbCB8fCBzY3JvbGxFbGVtZW50LFxuICAgICAgc2Nyb2xsSW50b1ZpZXc6IEVsZW1lbnQucHJvdG90eXBlLnNjcm9sbEludG9WaWV3XG4gICAgfTtcblxuICAgIC8vIGRlZmluZSB0aW1pbmcgbWV0aG9kXG4gICAgdmFyIG5vdyA9XG4gICAgICB3LnBlcmZvcm1hbmNlICYmIHcucGVyZm9ybWFuY2Uubm93XG4gICAgICAgID8gdy5wZXJmb3JtYW5jZS5ub3cuYmluZCh3LnBlcmZvcm1hbmNlKVxuICAgICAgICA6IERhdGUubm93O1xuXG4gICAgLyoqXG4gICAgICogaW5kaWNhdGVzIGlmIGEgdGhlIGN1cnJlbnQgYnJvd3NlciBpcyBtYWRlIGJ5IE1pY3Jvc29mdFxuICAgICAqIEBtZXRob2QgaXNNaWNyb3NvZnRCcm93c2VyXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IHVzZXJBZ2VudFxuICAgICAqIEByZXR1cm5zIHtCb29sZWFufVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGlzTWljcm9zb2Z0QnJvd3Nlcih1c2VyQWdlbnQpIHtcbiAgICAgIHZhciB1c2VyQWdlbnRQYXR0ZXJucyA9IFsnTVNJRSAnLCAnVHJpZGVudC8nLCAnRWRnZS8nXTtcblxuICAgICAgcmV0dXJuIG5ldyBSZWdFeHAodXNlckFnZW50UGF0dGVybnMuam9pbignfCcpKS50ZXN0KHVzZXJBZ2VudCk7XG4gICAgfVxuXG4gICAgLypcbiAgICAgKiBJRSBoYXMgcm91bmRpbmcgYnVnIHJvdW5kaW5nIGRvd24gY2xpZW50SGVpZ2h0IGFuZCBjbGllbnRXaWR0aCBhbmRcbiAgICAgKiByb3VuZGluZyB1cCBzY3JvbGxIZWlnaHQgYW5kIHNjcm9sbFdpZHRoIGNhdXNpbmcgZmFsc2UgcG9zaXRpdmVzXG4gICAgICogb24gaGFzU2Nyb2xsYWJsZVNwYWNlXG4gICAgICovXG4gICAgdmFyIFJPVU5ESU5HX1RPTEVSQU5DRSA9IGlzTWljcm9zb2Z0QnJvd3Nlcih3Lm5hdmlnYXRvci51c2VyQWdlbnQpID8gMSA6IDA7XG5cbiAgICAvKipcbiAgICAgKiBjaGFuZ2VzIHNjcm9sbCBwb3NpdGlvbiBpbnNpZGUgYW4gZWxlbWVudFxuICAgICAqIEBtZXRob2Qgc2Nyb2xsRWxlbWVudFxuICAgICAqIEBwYXJhbSB7TnVtYmVyfSB4XG4gICAgICogQHBhcmFtIHtOdW1iZXJ9IHlcbiAgICAgKiBAcmV0dXJucyB7dW5kZWZpbmVkfVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIHNjcm9sbEVsZW1lbnQoeCwgeSkge1xuICAgICAgdGhpcy5zY3JvbGxMZWZ0ID0geDtcbiAgICAgIHRoaXMuc2Nyb2xsVG9wID0geTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiByZXR1cm5zIHJlc3VsdCBvZiBhcHBseWluZyBlYXNlIG1hdGggZnVuY3Rpb24gdG8gYSBudW1iZXJcbiAgICAgKiBAbWV0aG9kIGVhc2VcbiAgICAgKiBAcGFyYW0ge051bWJlcn0ga1xuICAgICAqIEByZXR1cm5zIHtOdW1iZXJ9XG4gICAgICovXG4gICAgZnVuY3Rpb24gZWFzZShrKSB7XG4gICAgICByZXR1cm4gMC41ICogKDEgLSBNYXRoLmNvcyhNYXRoLlBJICogaykpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIGluZGljYXRlcyBpZiBhIHNtb290aCBiZWhhdmlvciBzaG91bGQgYmUgYXBwbGllZFxuICAgICAqIEBtZXRob2Qgc2hvdWxkQmFpbE91dFxuICAgICAqIEBwYXJhbSB7TnVtYmVyfE9iamVjdH0gZmlyc3RBcmdcbiAgICAgKiBAcmV0dXJucyB7Qm9vbGVhbn1cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBzaG91bGRCYWlsT3V0KGZpcnN0QXJnKSB7XG4gICAgICBpZiAoXG4gICAgICAgIGZpcnN0QXJnID09PSBudWxsIHx8XG4gICAgICAgIHR5cGVvZiBmaXJzdEFyZyAhPT0gJ29iamVjdCcgfHxcbiAgICAgICAgZmlyc3RBcmcuYmVoYXZpb3IgPT09IHVuZGVmaW5lZCB8fFxuICAgICAgICBmaXJzdEFyZy5iZWhhdmlvciA9PT0gJ2F1dG8nIHx8XG4gICAgICAgIGZpcnN0QXJnLmJlaGF2aW9yID09PSAnaW5zdGFudCdcbiAgICAgICkge1xuICAgICAgICAvLyBmaXJzdCBhcmd1bWVudCBpcyBub3QgYW4gb2JqZWN0L251bGxcbiAgICAgICAgLy8gb3IgYmVoYXZpb3IgaXMgYXV0bywgaW5zdGFudCBvciB1bmRlZmluZWRcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9XG5cbiAgICAgIGlmICh0eXBlb2YgZmlyc3RBcmcgPT09ICdvYmplY3QnICYmIGZpcnN0QXJnLmJlaGF2aW9yID09PSAnc21vb3RoJykge1xuICAgICAgICAvLyBmaXJzdCBhcmd1bWVudCBpcyBhbiBvYmplY3QgYW5kIGJlaGF2aW9yIGlzIHNtb290aFxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG5cbiAgICAgIC8vIHRocm93IGVycm9yIHdoZW4gYmVoYXZpb3IgaXMgbm90IHN1cHBvcnRlZFxuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcbiAgICAgICAgJ2JlaGF2aW9yIG1lbWJlciBvZiBTY3JvbGxPcHRpb25zICcgK1xuICAgICAgICAgIGZpcnN0QXJnLmJlaGF2aW9yICtcbiAgICAgICAgICAnIGlzIG5vdCBhIHZhbGlkIHZhbHVlIGZvciBlbnVtZXJhdGlvbiBTY3JvbGxCZWhhdmlvci4nXG4gICAgICApO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIGluZGljYXRlcyBpZiBhbiBlbGVtZW50IGhhcyBzY3JvbGxhYmxlIHNwYWNlIGluIHRoZSBwcm92aWRlZCBheGlzXG4gICAgICogQG1ldGhvZCBoYXNTY3JvbGxhYmxlU3BhY2VcbiAgICAgKiBAcGFyYW0ge05vZGV9IGVsXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IGF4aXNcbiAgICAgKiBAcmV0dXJucyB7Qm9vbGVhbn1cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBoYXNTY3JvbGxhYmxlU3BhY2UoZWwsIGF4aXMpIHtcbiAgICAgIGlmIChheGlzID09PSAnWScpIHtcbiAgICAgICAgcmV0dXJuIGVsLmNsaWVudEhlaWdodCArIFJPVU5ESU5HX1RPTEVSQU5DRSA8IGVsLnNjcm9sbEhlaWdodDtcbiAgICAgIH1cblxuICAgICAgaWYgKGF4aXMgPT09ICdYJykge1xuICAgICAgICByZXR1cm4gZWwuY2xpZW50V2lkdGggKyBST1VORElOR19UT0xFUkFOQ0UgPCBlbC5zY3JvbGxXaWR0aDtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBpbmRpY2F0ZXMgaWYgYW4gZWxlbWVudCBoYXMgYSBzY3JvbGxhYmxlIG92ZXJmbG93IHByb3BlcnR5IGluIHRoZSBheGlzXG4gICAgICogQG1ldGhvZCBjYW5PdmVyZmxvd1xuICAgICAqIEBwYXJhbSB7Tm9kZX0gZWxcbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gYXhpc1xuICAgICAqIEByZXR1cm5zIHtCb29sZWFufVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGNhbk92ZXJmbG93KGVsLCBheGlzKSB7XG4gICAgICB2YXIgb3ZlcmZsb3dWYWx1ZSA9IHcuZ2V0Q29tcHV0ZWRTdHlsZShlbCwgbnVsbClbJ292ZXJmbG93JyArIGF4aXNdO1xuXG4gICAgICByZXR1cm4gb3ZlcmZsb3dWYWx1ZSA9PT0gJ2F1dG8nIHx8IG92ZXJmbG93VmFsdWUgPT09ICdzY3JvbGwnO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIGluZGljYXRlcyBpZiBhbiBlbGVtZW50IGNhbiBiZSBzY3JvbGxlZCBpbiBlaXRoZXIgYXhpc1xuICAgICAqIEBtZXRob2QgaXNTY3JvbGxhYmxlXG4gICAgICogQHBhcmFtIHtOb2RlfSBlbFxuICAgICAqIEBwYXJhbSB7U3RyaW5nfSBheGlzXG4gICAgICogQHJldHVybnMge0Jvb2xlYW59XG4gICAgICovXG4gICAgZnVuY3Rpb24gaXNTY3JvbGxhYmxlKGVsKSB7XG4gICAgICB2YXIgaXNTY3JvbGxhYmxlWSA9IGhhc1Njcm9sbGFibGVTcGFjZShlbCwgJ1knKSAmJiBjYW5PdmVyZmxvdyhlbCwgJ1knKTtcbiAgICAgIHZhciBpc1Njcm9sbGFibGVYID0gaGFzU2Nyb2xsYWJsZVNwYWNlKGVsLCAnWCcpICYmIGNhbk92ZXJmbG93KGVsLCAnWCcpO1xuXG4gICAgICByZXR1cm4gaXNTY3JvbGxhYmxlWSB8fCBpc1Njcm9sbGFibGVYO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIGZpbmRzIHNjcm9sbGFibGUgcGFyZW50IG9mIGFuIGVsZW1lbnRcbiAgICAgKiBAbWV0aG9kIGZpbmRTY3JvbGxhYmxlUGFyZW50XG4gICAgICogQHBhcmFtIHtOb2RlfSBlbFxuICAgICAqIEByZXR1cm5zIHtOb2RlfSBlbFxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGZpbmRTY3JvbGxhYmxlUGFyZW50KGVsKSB7XG4gICAgICB2YXIgaXNCb2R5O1xuXG4gICAgICBkbyB7XG4gICAgICAgIGVsID0gZWwucGFyZW50Tm9kZTtcblxuICAgICAgICBpc0JvZHkgPSBlbCA9PT0gZC5ib2R5O1xuICAgICAgfSB3aGlsZSAoaXNCb2R5ID09PSBmYWxzZSAmJiBpc1Njcm9sbGFibGUoZWwpID09PSBmYWxzZSk7XG5cbiAgICAgIGlzQm9keSA9IG51bGw7XG5cbiAgICAgIHJldHVybiBlbDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBzZWxmIGludm9rZWQgZnVuY3Rpb24gdGhhdCwgZ2l2ZW4gYSBjb250ZXh0LCBzdGVwcyB0aHJvdWdoIHNjcm9sbGluZ1xuICAgICAqIEBtZXRob2Qgc3RlcFxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBjb250ZXh0XG4gICAgICogQHJldHVybnMge3VuZGVmaW5lZH1cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBzdGVwKGNvbnRleHQpIHtcbiAgICAgIHZhciB0aW1lID0gbm93KCk7XG4gICAgICB2YXIgdmFsdWU7XG4gICAgICB2YXIgY3VycmVudFg7XG4gICAgICB2YXIgY3VycmVudFk7XG4gICAgICB2YXIgZWxhcHNlZCA9ICh0aW1lIC0gY29udGV4dC5zdGFydFRpbWUpIC8gU0NST0xMX1RJTUU7XG5cbiAgICAgIC8vIGF2b2lkIGVsYXBzZWQgdGltZXMgaGlnaGVyIHRoYW4gb25lXG4gICAgICBlbGFwc2VkID0gZWxhcHNlZCA+IDEgPyAxIDogZWxhcHNlZDtcblxuICAgICAgLy8gYXBwbHkgZWFzaW5nIHRvIGVsYXBzZWQgdGltZVxuICAgICAgdmFsdWUgPSBlYXNlKGVsYXBzZWQpO1xuXG4gICAgICBjdXJyZW50WCA9IGNvbnRleHQuc3RhcnRYICsgKGNvbnRleHQueCAtIGNvbnRleHQuc3RhcnRYKSAqIHZhbHVlO1xuICAgICAgY3VycmVudFkgPSBjb250ZXh0LnN0YXJ0WSArIChjb250ZXh0LnkgLSBjb250ZXh0LnN0YXJ0WSkgKiB2YWx1ZTtcblxuICAgICAgY29udGV4dC5tZXRob2QuY2FsbChjb250ZXh0LnNjcm9sbGFibGUsIGN1cnJlbnRYLCBjdXJyZW50WSk7XG5cbiAgICAgIC8vIHNjcm9sbCBtb3JlIGlmIHdlIGhhdmUgbm90IHJlYWNoZWQgb3VyIGRlc3RpbmF0aW9uXG4gICAgICBpZiAoY3VycmVudFggIT09IGNvbnRleHQueCB8fCBjdXJyZW50WSAhPT0gY29udGV4dC55KSB7XG4gICAgICAgIHcucmVxdWVzdEFuaW1hdGlvbkZyYW1lKHN0ZXAuYmluZCh3LCBjb250ZXh0KSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogc2Nyb2xscyB3aW5kb3cgb3IgZWxlbWVudCB3aXRoIGEgc21vb3RoIGJlaGF2aW9yXG4gICAgICogQG1ldGhvZCBzbW9vdGhTY3JvbGxcbiAgICAgKiBAcGFyYW0ge09iamVjdHxOb2RlfSBlbFxuICAgICAqIEBwYXJhbSB7TnVtYmVyfSB4XG4gICAgICogQHBhcmFtIHtOdW1iZXJ9IHlcbiAgICAgKiBAcmV0dXJucyB7dW5kZWZpbmVkfVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIHNtb290aFNjcm9sbChlbCwgeCwgeSkge1xuICAgICAgdmFyIHNjcm9sbGFibGU7XG4gICAgICB2YXIgc3RhcnRYO1xuICAgICAgdmFyIHN0YXJ0WTtcbiAgICAgIHZhciBtZXRob2Q7XG4gICAgICB2YXIgc3RhcnRUaW1lID0gbm93KCk7XG5cbiAgICAgIC8vIGRlZmluZSBzY3JvbGwgY29udGV4dFxuICAgICAgaWYgKGVsID09PSBkLmJvZHkpIHtcbiAgICAgICAgc2Nyb2xsYWJsZSA9IHc7XG4gICAgICAgIHN0YXJ0WCA9IHcuc2Nyb2xsWCB8fCB3LnBhZ2VYT2Zmc2V0O1xuICAgICAgICBzdGFydFkgPSB3LnNjcm9sbFkgfHwgdy5wYWdlWU9mZnNldDtcbiAgICAgICAgbWV0aG9kID0gb3JpZ2luYWwuc2Nyb2xsO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgc2Nyb2xsYWJsZSA9IGVsO1xuICAgICAgICBzdGFydFggPSBlbC5zY3JvbGxMZWZ0O1xuICAgICAgICBzdGFydFkgPSBlbC5zY3JvbGxUb3A7XG4gICAgICAgIG1ldGhvZCA9IHNjcm9sbEVsZW1lbnQ7XG4gICAgICB9XG5cbiAgICAgIC8vIHNjcm9sbCBsb29waW5nIG92ZXIgYSBmcmFtZVxuICAgICAgc3RlcCh7XG4gICAgICAgIHNjcm9sbGFibGU6IHNjcm9sbGFibGUsXG4gICAgICAgIG1ldGhvZDogbWV0aG9kLFxuICAgICAgICBzdGFydFRpbWU6IHN0YXJ0VGltZSxcbiAgICAgICAgc3RhcnRYOiBzdGFydFgsXG4gICAgICAgIHN0YXJ0WTogc3RhcnRZLFxuICAgICAgICB4OiB4LFxuICAgICAgICB5OiB5XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICAvLyBPUklHSU5BTCBNRVRIT0RTIE9WRVJSSURFU1xuICAgIC8vIHcuc2Nyb2xsIGFuZCB3LnNjcm9sbFRvXG4gICAgdy5zY3JvbGwgPSB3LnNjcm9sbFRvID0gZnVuY3Rpb24oKSB7XG4gICAgICAvLyBhdm9pZCBhY3Rpb24gd2hlbiBubyBhcmd1bWVudHMgYXJlIHBhc3NlZFxuICAgICAgaWYgKGFyZ3VtZW50c1swXSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgLy8gYXZvaWQgc21vb3RoIGJlaGF2aW9yIGlmIG5vdCByZXF1aXJlZFxuICAgICAgaWYgKHNob3VsZEJhaWxPdXQoYXJndW1lbnRzWzBdKSA9PT0gdHJ1ZSkge1xuICAgICAgICBvcmlnaW5hbC5zY3JvbGwuY2FsbChcbiAgICAgICAgICB3LFxuICAgICAgICAgIGFyZ3VtZW50c1swXS5sZWZ0ICE9PSB1bmRlZmluZWRcbiAgICAgICAgICAgID8gYXJndW1lbnRzWzBdLmxlZnRcbiAgICAgICAgICAgIDogdHlwZW9mIGFyZ3VtZW50c1swXSAhPT0gJ29iamVjdCdcbiAgICAgICAgICAgICAgPyBhcmd1bWVudHNbMF1cbiAgICAgICAgICAgICAgOiB3LnNjcm9sbFggfHwgdy5wYWdlWE9mZnNldCxcbiAgICAgICAgICAvLyB1c2UgdG9wIHByb3AsIHNlY29uZCBhcmd1bWVudCBpZiBwcmVzZW50IG9yIGZhbGxiYWNrIHRvIHNjcm9sbFlcbiAgICAgICAgICBhcmd1bWVudHNbMF0udG9wICE9PSB1bmRlZmluZWRcbiAgICAgICAgICAgID8gYXJndW1lbnRzWzBdLnRvcFxuICAgICAgICAgICAgOiBhcmd1bWVudHNbMV0gIT09IHVuZGVmaW5lZFxuICAgICAgICAgICAgICA/IGFyZ3VtZW50c1sxXVxuICAgICAgICAgICAgICA6IHcuc2Nyb2xsWSB8fCB3LnBhZ2VZT2Zmc2V0XG4gICAgICAgICk7XG5cbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICAvLyBMRVQgVEhFIFNNT09USE5FU1MgQkVHSU4hXG4gICAgICBzbW9vdGhTY3JvbGwuY2FsbChcbiAgICAgICAgdyxcbiAgICAgICAgZC5ib2R5LFxuICAgICAgICBhcmd1bWVudHNbMF0ubGVmdCAhPT0gdW5kZWZpbmVkXG4gICAgICAgICAgPyB+fmFyZ3VtZW50c1swXS5sZWZ0XG4gICAgICAgICAgOiB3LnNjcm9sbFggfHwgdy5wYWdlWE9mZnNldCxcbiAgICAgICAgYXJndW1lbnRzWzBdLnRvcCAhPT0gdW5kZWZpbmVkXG4gICAgICAgICAgPyB+fmFyZ3VtZW50c1swXS50b3BcbiAgICAgICAgICA6IHcuc2Nyb2xsWSB8fCB3LnBhZ2VZT2Zmc2V0XG4gICAgICApO1xuICAgIH07XG5cbiAgICAvLyB3LnNjcm9sbEJ5XG4gICAgdy5zY3JvbGxCeSA9IGZ1bmN0aW9uKCkge1xuICAgICAgLy8gYXZvaWQgYWN0aW9uIHdoZW4gbm8gYXJndW1lbnRzIGFyZSBwYXNzZWRcbiAgICAgIGlmIChhcmd1bWVudHNbMF0gPT09IHVuZGVmaW5lZCkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIC8vIGF2b2lkIHNtb290aCBiZWhhdmlvciBpZiBub3QgcmVxdWlyZWRcbiAgICAgIGlmIChzaG91bGRCYWlsT3V0KGFyZ3VtZW50c1swXSkpIHtcbiAgICAgICAgb3JpZ2luYWwuc2Nyb2xsQnkuY2FsbChcbiAgICAgICAgICB3LFxuICAgICAgICAgIGFyZ3VtZW50c1swXS5sZWZ0ICE9PSB1bmRlZmluZWRcbiAgICAgICAgICAgID8gYXJndW1lbnRzWzBdLmxlZnRcbiAgICAgICAgICAgIDogdHlwZW9mIGFyZ3VtZW50c1swXSAhPT0gJ29iamVjdCcgPyBhcmd1bWVudHNbMF0gOiAwLFxuICAgICAgICAgIGFyZ3VtZW50c1swXS50b3AgIT09IHVuZGVmaW5lZFxuICAgICAgICAgICAgPyBhcmd1bWVudHNbMF0udG9wXG4gICAgICAgICAgICA6IGFyZ3VtZW50c1sxXSAhPT0gdW5kZWZpbmVkID8gYXJndW1lbnRzWzFdIDogMFxuICAgICAgICApO1xuXG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgLy8gTEVUIFRIRSBTTU9PVEhORVNTIEJFR0lOIVxuICAgICAgc21vb3RoU2Nyb2xsLmNhbGwoXG4gICAgICAgIHcsXG4gICAgICAgIGQuYm9keSxcbiAgICAgICAgfn5hcmd1bWVudHNbMF0ubGVmdCArICh3LnNjcm9sbFggfHwgdy5wYWdlWE9mZnNldCksXG4gICAgICAgIH5+YXJndW1lbnRzWzBdLnRvcCArICh3LnNjcm9sbFkgfHwgdy5wYWdlWU9mZnNldClcbiAgICAgICk7XG4gICAgfTtcblxuICAgIC8vIEVsZW1lbnQucHJvdG90eXBlLnNjcm9sbCBhbmQgRWxlbWVudC5wcm90b3R5cGUuc2Nyb2xsVG9cbiAgICBFbGVtZW50LnByb3RvdHlwZS5zY3JvbGwgPSBFbGVtZW50LnByb3RvdHlwZS5zY3JvbGxUbyA9IGZ1bmN0aW9uKCkge1xuICAgICAgLy8gYXZvaWQgYWN0aW9uIHdoZW4gbm8gYXJndW1lbnRzIGFyZSBwYXNzZWRcbiAgICAgIGlmIChhcmd1bWVudHNbMF0gPT09IHVuZGVmaW5lZCkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIC8vIGF2b2lkIHNtb290aCBiZWhhdmlvciBpZiBub3QgcmVxdWlyZWRcbiAgICAgIGlmIChzaG91bGRCYWlsT3V0KGFyZ3VtZW50c1swXSkgPT09IHRydWUpIHtcbiAgICAgICAgLy8gaWYgb25lIG51bWJlciBpcyBwYXNzZWQsIHRocm93IGVycm9yIHRvIG1hdGNoIEZpcmVmb3ggaW1wbGVtZW50YXRpb25cbiAgICAgICAgaWYgKHR5cGVvZiBhcmd1bWVudHNbMF0gPT09ICdudW1iZXInICYmIGFyZ3VtZW50c1sxXSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IFN5bnRheEVycm9yKCdWYWx1ZSBjb3VsZCBub3QgYmUgY29udmVydGVkJyk7XG4gICAgICAgIH1cblxuICAgICAgICBvcmlnaW5hbC5lbGVtZW50U2Nyb2xsLmNhbGwoXG4gICAgICAgICAgdGhpcyxcbiAgICAgICAgICAvLyB1c2UgbGVmdCBwcm9wLCBmaXJzdCBudW1iZXIgYXJndW1lbnQgb3IgZmFsbGJhY2sgdG8gc2Nyb2xsTGVmdFxuICAgICAgICAgIGFyZ3VtZW50c1swXS5sZWZ0ICE9PSB1bmRlZmluZWRcbiAgICAgICAgICAgID8gfn5hcmd1bWVudHNbMF0ubGVmdFxuICAgICAgICAgICAgOiB0eXBlb2YgYXJndW1lbnRzWzBdICE9PSAnb2JqZWN0JyA/IH5+YXJndW1lbnRzWzBdIDogdGhpcy5zY3JvbGxMZWZ0LFxuICAgICAgICAgIC8vIHVzZSB0b3AgcHJvcCwgc2Vjb25kIGFyZ3VtZW50IG9yIGZhbGxiYWNrIHRvIHNjcm9sbFRvcFxuICAgICAgICAgIGFyZ3VtZW50c1swXS50b3AgIT09IHVuZGVmaW5lZFxuICAgICAgICAgICAgPyB+fmFyZ3VtZW50c1swXS50b3BcbiAgICAgICAgICAgIDogYXJndW1lbnRzWzFdICE9PSB1bmRlZmluZWQgPyB+fmFyZ3VtZW50c1sxXSA6IHRoaXMuc2Nyb2xsVG9wXG4gICAgICAgICk7XG5cbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICB2YXIgbGVmdCA9IGFyZ3VtZW50c1swXS5sZWZ0O1xuICAgICAgdmFyIHRvcCA9IGFyZ3VtZW50c1swXS50b3A7XG5cbiAgICAgIC8vIExFVCBUSEUgU01PT1RITkVTUyBCRUdJTiFcbiAgICAgIHNtb290aFNjcm9sbC5jYWxsKFxuICAgICAgICB0aGlzLFxuICAgICAgICB0aGlzLFxuICAgICAgICB0eXBlb2YgbGVmdCA9PT0gJ3VuZGVmaW5lZCcgPyB0aGlzLnNjcm9sbExlZnQgOiB+fmxlZnQsXG4gICAgICAgIHR5cGVvZiB0b3AgPT09ICd1bmRlZmluZWQnID8gdGhpcy5zY3JvbGxUb3AgOiB+fnRvcFxuICAgICAgKTtcbiAgICB9O1xuXG4gICAgLy8gRWxlbWVudC5wcm90b3R5cGUuc2Nyb2xsQnlcbiAgICBFbGVtZW50LnByb3RvdHlwZS5zY3JvbGxCeSA9IGZ1bmN0aW9uKCkge1xuICAgICAgLy8gYXZvaWQgYWN0aW9uIHdoZW4gbm8gYXJndW1lbnRzIGFyZSBwYXNzZWRcbiAgICAgIGlmIChhcmd1bWVudHNbMF0gPT09IHVuZGVmaW5lZCkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIC8vIGF2b2lkIHNtb290aCBiZWhhdmlvciBpZiBub3QgcmVxdWlyZWRcbiAgICAgIGlmIChzaG91bGRCYWlsT3V0KGFyZ3VtZW50c1swXSkgPT09IHRydWUpIHtcbiAgICAgICAgb3JpZ2luYWwuZWxlbWVudFNjcm9sbC5jYWxsKFxuICAgICAgICAgIHRoaXMsXG4gICAgICAgICAgYXJndW1lbnRzWzBdLmxlZnQgIT09IHVuZGVmaW5lZFxuICAgICAgICAgICAgPyB+fmFyZ3VtZW50c1swXS5sZWZ0ICsgdGhpcy5zY3JvbGxMZWZ0XG4gICAgICAgICAgICA6IH5+YXJndW1lbnRzWzBdICsgdGhpcy5zY3JvbGxMZWZ0LFxuICAgICAgICAgIGFyZ3VtZW50c1swXS50b3AgIT09IHVuZGVmaW5lZFxuICAgICAgICAgICAgPyB+fmFyZ3VtZW50c1swXS50b3AgKyB0aGlzLnNjcm9sbFRvcFxuICAgICAgICAgICAgOiB+fmFyZ3VtZW50c1sxXSArIHRoaXMuc2Nyb2xsVG9wXG4gICAgICAgICk7XG5cbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICB0aGlzLnNjcm9sbCh7XG4gICAgICAgIGxlZnQ6IH5+YXJndW1lbnRzWzBdLmxlZnQgKyB0aGlzLnNjcm9sbExlZnQsXG4gICAgICAgIHRvcDogfn5hcmd1bWVudHNbMF0udG9wICsgdGhpcy5zY3JvbGxUb3AsXG4gICAgICAgIGJlaGF2aW9yOiBhcmd1bWVudHNbMF0uYmVoYXZpb3JcbiAgICAgIH0pO1xuICAgIH07XG5cbiAgICAvLyBFbGVtZW50LnByb3RvdHlwZS5zY3JvbGxJbnRvVmlld1xuICAgIEVsZW1lbnQucHJvdG90eXBlLnNjcm9sbEludG9WaWV3ID0gZnVuY3Rpb24oKSB7XG4gICAgICAvLyBhdm9pZCBzbW9vdGggYmVoYXZpb3IgaWYgbm90IHJlcXVpcmVkXG4gICAgICBpZiAoc2hvdWxkQmFpbE91dChhcmd1bWVudHNbMF0pID09PSB0cnVlKSB7XG4gICAgICAgIG9yaWdpbmFsLnNjcm9sbEludG9WaWV3LmNhbGwoXG4gICAgICAgICAgdGhpcyxcbiAgICAgICAgICBhcmd1bWVudHNbMF0gPT09IHVuZGVmaW5lZCA/IHRydWUgOiBhcmd1bWVudHNbMF1cbiAgICAgICAgKTtcblxuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIC8vIExFVCBUSEUgU01PT1RITkVTUyBCRUdJTiFcbiAgICAgIHZhciBzY3JvbGxhYmxlUGFyZW50ID0gZmluZFNjcm9sbGFibGVQYXJlbnQodGhpcyk7XG4gICAgICB2YXIgcGFyZW50UmVjdHMgPSBzY3JvbGxhYmxlUGFyZW50LmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xuICAgICAgdmFyIGNsaWVudFJlY3RzID0gdGhpcy5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcblxuICAgICAgaWYgKHNjcm9sbGFibGVQYXJlbnQgIT09IGQuYm9keSkge1xuICAgICAgICAvLyByZXZlYWwgZWxlbWVudCBpbnNpZGUgcGFyZW50XG4gICAgICAgIHNtb290aFNjcm9sbC5jYWxsKFxuICAgICAgICAgIHRoaXMsXG4gICAgICAgICAgc2Nyb2xsYWJsZVBhcmVudCxcbiAgICAgICAgICBzY3JvbGxhYmxlUGFyZW50LnNjcm9sbExlZnQgKyBjbGllbnRSZWN0cy5sZWZ0IC0gcGFyZW50UmVjdHMubGVmdCxcbiAgICAgICAgICBzY3JvbGxhYmxlUGFyZW50LnNjcm9sbFRvcCArIGNsaWVudFJlY3RzLnRvcCAtIHBhcmVudFJlY3RzLnRvcFxuICAgICAgICApO1xuXG4gICAgICAgIC8vIHJldmVhbCBwYXJlbnQgaW4gdmlld3BvcnQgdW5sZXNzIGlzIGZpeGVkXG4gICAgICAgIGlmICh3LmdldENvbXB1dGVkU3R5bGUoc2Nyb2xsYWJsZVBhcmVudCkucG9zaXRpb24gIT09ICdmaXhlZCcpIHtcbiAgICAgICAgICB3LnNjcm9sbEJ5KHtcbiAgICAgICAgICAgIGxlZnQ6IHBhcmVudFJlY3RzLmxlZnQsXG4gICAgICAgICAgICB0b3A6IHBhcmVudFJlY3RzLnRvcCxcbiAgICAgICAgICAgIGJlaGF2aW9yOiAnc21vb3RoJ1xuICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyByZXZlYWwgZWxlbWVudCBpbiB2aWV3cG9ydFxuICAgICAgICB3LnNjcm9sbEJ5KHtcbiAgICAgICAgICBsZWZ0OiBjbGllbnRSZWN0cy5sZWZ0LFxuICAgICAgICAgIHRvcDogY2xpZW50UmVjdHMudG9wLFxuICAgICAgICAgIGJlaGF2aW9yOiAnc21vb3RoJ1xuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9O1xuICB9XG5cbiAgaWYgKHR5cGVvZiBleHBvcnRzID09PSAnb2JqZWN0JyAmJiB0eXBlb2YgbW9kdWxlICE9PSAndW5kZWZpbmVkJykge1xuICAgIC8vIGNvbW1vbmpzXG4gICAgbW9kdWxlLmV4cG9ydHMgPSB7IHBvbHlmaWxsOiBwb2x5ZmlsbCB9O1xuICB9IGVsc2Uge1xuICAgIC8vIGdsb2JhbFxuICAgIHBvbHlmaWxsKCk7XG4gIH1cblxufSgpKTtcbiIsImltcG9ydCBzbW9vdGhzY3JvbGwgZnJvbSAnc21vb3Roc2Nyb2xsLXBvbHlmaWxsJztcblxuaW1wb3J0IHsgYXJ0aWNsZVRlbXBsYXRlLCBuYXZMZyB9IGZyb20gJy4vdGVtcGxhdGVzJztcbmltcG9ydCB7IGRlYm91bmNlIH0gZnJvbSAnLi91dGlscyc7XG5cblxuY29uc3QgREIgPSAnaHR0cHM6Ly9uZXh1cy1jYXRhbG9nLmZpcmViYXNlaW8uY29tL3Bvc3RzLmpzb24/YXV0aD03ZzdweUtLeWtOM041ZXdySW1oT2FTNnZ3ckZzYzVmS2tyazhlanpmJztcbmNvbnN0IGFscGhhYmV0ID0gWydhJywgJ2InLCAnYycsICdkJywgJ2UnLCAnZicsICdnJywgJ2gnLCAnaScsICdqJywgJ2snLCAnbCcsICdtJywgJ24nLCAnbycsICdwJywgJ3InLCAncycsICd0JywgJ3UnLCAndicsICd3JywgJ3knLCAneiddO1xuXG5jb25zdCAkbG9hZGluZyA9IEFycmF5LmZyb20oZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbCgnLmxvYWRpbmcnKSk7XG5jb25zdCAkbmF2ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2pzLW5hdicpO1xuY29uc3QgJHBhcmFsbGF4ID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignLnBhcmFsbGF4Jyk7XG5jb25zdCAkY29udGVudCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJy5jb250ZW50Jyk7XG5jb25zdCAkdGl0bGUgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnanMtdGl0bGUnKTtcbmNvbnN0ICRhcnJvdyA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJy5hcnJvdycpO1xuY29uc3QgJG1vZGFsID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignLm1vZGFsJyk7XG5jb25zdCAkbGlnaHRib3ggPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcubGlnaHRib3gnKTtcbmNvbnN0ICR2aWV3ID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignLmxpZ2h0Ym94LXZpZXcnKTtcblxubGV0IHNvcnRLZXkgPSAwOyAvLyAwID0gYXJ0aXN0LCAxID0gdGl0bGVcbmxldCBlbnRyaWVzID0geyBieUF1dGhvcjogW10sIGJ5VGl0bGU6IFtdIH07XG5sZXQgY3VycmVudExldHRlciA9ICdBJztcblxubGV0IGxpZ2h0Ym94ID0gZmFsc2U7XG5sZXQgeDIgPSBmYWxzZTtcbmNvbnN0IGF0dGFjaEltYWdlTGlzdGVuZXJzID0gKCkgPT4ge1xuXHRjb25zdCAkaW1hZ2VzID0gQXJyYXkuZnJvbShkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKCcuYXJ0aWNsZS1pbWFnZScpKTtcblxuXHQkaW1hZ2VzLmZvckVhY2goaW1nID0+IHtcblx0XHRpbWcuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoZXZ0KSA9PiB7XG5cdFx0XHRpZiAoIWxpZ2h0Ym94KSB7XG5cdFx0XHRcdGxldCBzcmMgPSBpbWcuc3JjO1xuXHRcdFx0XHRcblx0XHRcdFx0JGxpZ2h0Ym94LmNsYXNzTGlzdC5hZGQoJ3Nob3ctaW1nJyk7XG5cdFx0XHRcdCR2aWV3LnNldEF0dHJpYnV0ZSgnc3R5bGUnLCBgYmFja2dyb3VuZC1pbWFnZTogdXJsKCR7c3JjfSlgKTtcblx0XHRcdFx0bGlnaHRib3ggPSB0cnVlO1xuXHRcdFx0fVxuXHRcdH0pO1xuXHR9KTtcblxuXHQkdmlldy5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsICgpID0+IHtcblx0XHRpZiAobGlnaHRib3gpIHtcblx0XHRcdCRsaWdodGJveC5jbGFzc0xpc3QucmVtb3ZlKCdzaG93LWltZycpO1xuXHRcdFx0bGlnaHRib3ggPSBmYWxzZTtcblx0XHR9XG5cdH0pO1xufTtcblxubGV0IG1vZGFsID0gZmFsc2U7XG5jb25zdCBhdHRhY2hNb2RhbExpc3RlbmVycyA9ICgpID0+IHtcblx0Y29uc3QgJGZpbmQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnanMtZmluZCcpO1xuXHRcblx0JGZpbmQuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoKSA9PiB7XG5cdFx0JG1vZGFsLmNsYXNzTGlzdC5hZGQoJ3Nob3cnKTtcblx0XHRtb2RhbCA9IHRydWU7XG5cdH0pO1xuXG5cdCRtb2RhbC5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsICgpID0+IHtcblx0XHQkbW9kYWwuY2xhc3NMaXN0LnJlbW92ZSgnc2hvdycpO1xuXHRcdG1vZGFsID0gZmFsc2U7XG5cdH0pO1xuXG5cdHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdrZXlkb3duJywgKCkgPT4ge1xuXHRcdGlmIChtb2RhbCkge1xuXHRcdFx0c2V0VGltZW91dCgoKSA9PiB7XG5cdFx0XHRcdCRtb2RhbC5jbGFzc0xpc3QucmVtb3ZlKCdzaG93Jyk7XG5cdFx0XHRcdG1vZGFsID0gZmFsc2U7XG5cdFx0XHR9LCA2MDApO1xuXHRcdH07XG5cdH0pO1xufVxuXG5jb25zdCBzY3JvbGxUb1RvcCA9ICgpID0+IHtcblx0bGV0IHRoaW5nID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2FuY2hvci10YXJnZXQnKTtcblx0dGhpbmcuc2Nyb2xsSW50b1ZpZXcoe2JlaGF2aW9yOiBcInNtb290aFwiLCBibG9jazogXCJzdGFydFwifSk7XG59XG5cbmxldCBwcmV2O1xubGV0IGN1cnJlbnQgPSAwO1xubGV0IGlzU2hvd2luZyA9IGZhbHNlO1xuY29uc3QgYXR0YWNoQXJyb3dMaXN0ZW5lcnMgPSAoKSA9PiB7XG5cdCRhcnJvdy5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsICgpID0+IHtcblx0XHRzY3JvbGxUb1RvcCgpO1xuXHR9KTtcblxuXHQkcGFyYWxsYXguYWRkRXZlbnRMaXN0ZW5lcignc2Nyb2xsJywgKCkgPT4ge1xuXG5cdFx0bGV0IHkgPSAkdGl0bGUuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCkueTtcblx0XHRpZiAoY3VycmVudCAhPT0geSkge1xuXHRcdFx0cHJldiA9IGN1cnJlbnQ7XG5cdFx0XHRjdXJyZW50ID0geTtcblx0XHR9XG5cblx0XHRpZiAoeSA8PSAtNTAgJiYgIWlzU2hvd2luZykge1xuXHRcdFx0JGFycm93LmNsYXNzTGlzdC5hZGQoJ3Nob3cnKTtcblx0XHRcdGlzU2hvd2luZyA9IHRydWU7XG5cdFx0fSBlbHNlIGlmICh5ID4gLTUwICYmIGlzU2hvd2luZykge1xuXHRcdFx0JGFycm93LmNsYXNzTGlzdC5yZW1vdmUoJ3Nob3cnKTtcblx0XHRcdGlzU2hvd2luZyA9IGZhbHNlO1xuXHRcdH1cblx0fSk7XG59O1xuXG5jb25zdCBhZGRTb3J0QnV0dG9uTGlzdGVuZXJzID0gKCkgPT4ge1xuXHRsZXQgJGJ5QXJ0aXN0ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2pzLWJ5LWFydGlzdCcpO1xuXHRsZXQgJGJ5VGl0bGUgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnanMtYnktdGl0bGUnKTtcblx0JGJ5QXJ0aXN0LmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKCkgPT4ge1xuXHRcdGlmIChzb3J0S2V5KSB7XG5cdFx0XHRzY3JvbGxUb1RvcCgpO1xuXHRcdFx0c29ydEtleSA9IDA7XG5cdFx0XHQkYnlBcnRpc3QuY2xhc3NMaXN0LmFkZCgnYWN0aXZlJyk7XG5cdFx0XHQkYnlUaXRsZS5jbGFzc0xpc3QucmVtb3ZlKCdhY3RpdmUnKTtcblxuXHRcdFx0cmVuZGVyRW50cmllcygpO1xuXHRcdH1cblx0fSk7XG5cblx0JGJ5VGl0bGUuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoKSA9PiB7XG5cdFx0aWYgKCFzb3J0S2V5KSB7XG5cdFx0XHRzY3JvbGxUb1RvcCgpO1xuXHRcdFx0c29ydEtleSA9IDE7XG5cdFx0XHQkYnlUaXRsZS5jbGFzc0xpc3QuYWRkKCdhY3RpdmUnKTtcblx0XHRcdCRieUFydGlzdC5jbGFzc0xpc3QucmVtb3ZlKCdhY3RpdmUnKTtcblxuXHRcdFx0cmVuZGVyRW50cmllcygpO1xuXHRcdH1cblx0fSk7XG59O1xuXG5jb25zdCBjbGVhckFuY2hvcnMgPSAocHJldlNlbGVjdG9yKSA9PiB7XG5cdGxldCAkZW50cmllcyA9IEFycmF5LmZyb20oZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbChwcmV2U2VsZWN0b3IpKTtcblx0JGVudHJpZXMuZm9yRWFjaChlbnRyeSA9PiBlbnRyeS5yZW1vdmVBdHRyaWJ1dGUoJ25hbWUnKSk7XG59O1xuXG5jb25zdCBmaW5kRmlyc3RFbnRyeSA9IChjaGFyKSA9PiB7XG5cdGxldCBzZWxlY3RvciA9IHNvcnRLZXkgPyAnLmpzLWVudHJ5LXRpdGxlJyA6ICcuanMtZW50cnktYXJ0aXN0Jztcblx0bGV0IHByZXZTZWxlY3RvciA9ICFzb3J0S2V5ID8gJy5qcy1lbnRyeS10aXRsZScgOiAnLmpzLWVudHJ5LWFydGlzdCc7XG5cdGxldCAkZW50cmllcyA9IEFycmF5LmZyb20oZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbChzZWxlY3RvcikpO1xuXG5cdGNsZWFyQW5jaG9ycyhwcmV2U2VsZWN0b3IpO1xuXG5cdHJldHVybiAkZW50cmllcy5maW5kKGVudHJ5ID0+IHtcblx0XHRsZXQgbm9kZSA9IGVudHJ5Lm5leHRFbGVtZW50U2libGluZztcblx0XHRyZXR1cm4gbm9kZS5pbm5lckhUTUxbMF0gPT09IGNoYXIgfHwgbm9kZS5pbm5lckhUTUxbMF0gPT09IGNoYXIudG9VcHBlckNhc2UoKTtcblx0fSk7XG59O1xuXG5cbmNvbnN0IG1ha2VBbHBoYWJldCA9ICgpID0+IHtcblx0Y29uc3QgYXR0YWNoQW5jaG9yTGlzdGVuZXIgPSAoJGFuY2hvciwgbGV0dGVyKSA9PiB7XG5cdFx0JGFuY2hvci5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsICgpID0+IHtcblx0XHRcdGNvbnN0IGxldHRlck5vZGUgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChsZXR0ZXIpO1xuXHRcdFx0bGV0IHRhcmdldDtcblxuXHRcdFx0aWYgKCFzb3J0S2V5KSB7XG5cdFx0XHRcdHRhcmdldCA9IGxldHRlciA9PT0gJ2EnID8gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2FuY2hvci10YXJnZXQnKSA6IGxldHRlck5vZGUucGFyZW50RWxlbWVudC5wYXJlbnRFbGVtZW50LnBhcmVudEVsZW1lbnQucGFyZW50RWxlbWVudC5wcmV2aW91c0VsZW1lbnRTaWJsaW5nLnF1ZXJ5U2VsZWN0b3IoJy5qcy1hcnRpY2xlLWFuY2hvci10YXJnZXQnKTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdHRhcmdldCA9IGxldHRlciA9PT0gJ2EnID8gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2FuY2hvci10YXJnZXQnKSA6IGxldHRlck5vZGUucGFyZW50RWxlbWVudC5wYXJlbnRFbGVtZW50LnBhcmVudEVsZW1lbnQucHJldmlvdXNFbGVtZW50U2libGluZy5xdWVyeVNlbGVjdG9yKCcuanMtYXJ0aWNsZS1hbmNob3ItdGFyZ2V0Jyk7XG5cdFx0XHR9O1xuXG5cdFx0XHR0YXJnZXQuc2Nyb2xsSW50b1ZpZXcoe2JlaGF2aW9yOiBcInNtb290aFwiLCBibG9jazogXCJzdGFydFwifSk7XG5cdFx0fSk7XG5cdH07XG5cblx0bGV0IGFjdGl2ZUVudHJpZXMgPSB7fTtcblx0bGV0ICRvdXRlciA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJy5hbHBoYWJldF9fbGV0dGVycycpO1xuXHQkb3V0ZXIuaW5uZXJIVE1MID0gJyc7XG5cblx0YWxwaGFiZXQuZm9yRWFjaChsZXR0ZXIgPT4ge1xuXHRcdGxldCAkZmlyc3RFbnRyeSA9IGZpbmRGaXJzdEVudHJ5KGxldHRlcik7XG5cdFx0bGV0ICRhbmNob3IgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdhJyk7XG5cblx0XHRpZiAoISRmaXJzdEVudHJ5KSByZXR1cm47XG5cblx0XHQkZmlyc3RFbnRyeS5pZCA9IGxldHRlcjtcblx0XHQkYW5jaG9yLmlubmVySFRNTCA9IGxldHRlci50b1VwcGVyQ2FzZSgpO1xuXHRcdCRhbmNob3IuY2xhc3NOYW1lID0gJ2FscGhhYmV0X19sZXR0ZXItYW5jaG9yJztcblxuXHRcdGF0dGFjaEFuY2hvckxpc3RlbmVyKCRhbmNob3IsIGxldHRlcik7XG5cdFx0JG91dGVyLmFwcGVuZENoaWxkKCRhbmNob3IpO1xuXHR9KTtcbn07XG5cbmNvbnN0IHJlbmRlckltYWdlcyA9IChpbWFnZXMsICRpbWFnZXMpID0+IHtcblx0aW1hZ2VzLmZvckVhY2goaW1hZ2UgPT4ge1xuXHRcdGNvbnN0IHNyYyA9IGAuLi8uLi9hc3NldHMvaW1hZ2VzLyR7aW1hZ2V9YDtcblx0XHRjb25zdCAkaW1nT3V0ZXIgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcblx0XHRjb25zdCAkaW1nID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnSU1HJyk7XG5cdFx0JGltZy5jbGFzc05hbWUgPSAnYXJ0aWNsZS1pbWFnZSc7XG5cdFx0JGltZy5zcmMgPSBzcmM7XG5cdFx0JGltZ091dGVyLmFwcGVuZENoaWxkKCRpbWcpO1xuXHRcdCRpbWFnZXMuYXBwZW5kQ2hpbGQoJGltZ091dGVyKTtcblx0fSlcbn07XG5cbmNvbnN0IHJlbmRlckVudHJpZXMgPSAoKSA9PiB7XG5cdGNvbnN0ICRhcnRpY2xlTGlzdCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdqcy1saXN0Jyk7XG5cdGNvbnN0IGVudHJpZXNMaXN0ID0gc29ydEtleSA/IGVudHJpZXMuYnlUaXRsZSA6IGVudHJpZXMuYnlBdXRob3I7XG5cblx0JGFydGljbGVMaXN0LmlubmVySFRNTCA9ICcnO1xuXG5cdGVudHJpZXNMaXN0LmZvckVhY2goZW50cnkgPT4ge1xuXHRcdGNvbnN0IHsgdGl0bGUsIGxhc3ROYW1lLCBmaXJzdE5hbWUsIGltYWdlcywgZGVzY3JpcHRpb24sIGRldGFpbCB9ID0gZW50cnk7XG5cblx0XHQkYXJ0aWNsZUxpc3QuaW5zZXJ0QWRqYWNlbnRIVE1MKCdiZWZvcmVlbmQnLCBhcnRpY2xlVGVtcGxhdGUpO1xuXG5cdFx0Y29uc3QgJGFsbFNsaWRlcnMgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKCcuYXJ0aWNsZV9fc2xpZGVyLWlubmVyJyk7XG5cdFx0Y29uc3QgJHNsaWRlciA9ICRhbGxTbGlkZXJzWyRhbGxTbGlkZXJzLmxlbmd0aCAtIDFdO1xuXHRcdC8vIGNvbnN0ICRpbWFnZXMgPSAkc2xpZGVyLnF1ZXJ5U2VsZWN0b3IoJy5hcnRpY2xlX19pbWFnZXMnKTtcblxuXHRcdGlmIChpbWFnZXMubGVuZ3RoKSByZW5kZXJJbWFnZXMoaW1hZ2VzLCAkc2xpZGVyKTtcblx0XHRcblx0XHRjb25zdCAkZGVzY3JpcHRpb25PdXRlciA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuXHRcdGNvbnN0ICRkZXNjcmlwdGlvbk5vZGUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdwJyk7XG5cdFx0Y29uc3QgJGRldGFpbE5vZGUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdwJyk7XG5cdFx0JGRlc2NyaXB0aW9uT3V0ZXIuY2xhc3NMaXN0LmFkZCgnYXJ0aWNsZS1kZXNjcmlwdGlvbl9fb3V0ZXInKTtcblx0XHQkZGVzY3JpcHRpb25Ob2RlLmNsYXNzTGlzdC5hZGQoJ2FydGljbGUtZGVzY3JpcHRpb24nKTtcblx0XHQkZGV0YWlsTm9kZS5jbGFzc0xpc3QuYWRkKCdhcnRpY2xlLWRldGFpbCcpO1xuXG5cdFx0JGRlc2NyaXB0aW9uTm9kZS5pbm5lckhUTUwgPSBkZXNjcmlwdGlvbjtcblx0XHQkZGV0YWlsTm9kZS5pbm5lckhUTUwgPSBkZXRhaWw7XG5cblx0XHQkZGVzY3JpcHRpb25PdXRlci5hcHBlbmRDaGlsZCgkZGVzY3JpcHRpb25Ob2RlLCAkZGV0YWlsTm9kZSk7XG5cdFx0JHNsaWRlci5hcHBlbmRDaGlsZCgkZGVzY3JpcHRpb25PdXRlcik7XG5cblx0XHRjb25zdCAkdGl0bGVOb2RlcyA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoJy5hcnRpY2xlLWhlYWRpbmdfX3RpdGxlJyk7XG5cdFx0Y29uc3QgJHRpdGxlID0gJHRpdGxlTm9kZXNbJHRpdGxlTm9kZXMubGVuZ3RoIC0gMV07XG5cblx0XHRjb25zdCAkZmlyc3ROb2RlcyA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoJy5hcnRpY2xlLWhlYWRpbmdfX25hbWUtLWZpcnN0Jyk7XG5cdFx0Y29uc3QgJGZpcnN0ID0gJGZpcnN0Tm9kZXNbJGZpcnN0Tm9kZXMubGVuZ3RoIC0gMV07XG5cblx0XHRjb25zdCAkbGFzdE5vZGVzID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbCgnLmFydGljbGUtaGVhZGluZ19fbmFtZS0tbGFzdCcpO1xuXHRcdGNvbnN0ICRsYXN0ID0gJGxhc3ROb2Rlc1skbGFzdE5vZGVzLmxlbmd0aCAtIDFdO1xuXG5cdFx0JHRpdGxlLmlubmVySFRNTCA9IHRpdGxlO1xuXHRcdCRmaXJzdC5pbm5lckhUTUwgPSBmaXJzdE5hbWU7XG5cdFx0JGxhc3QuaW5uZXJIVE1MID0gbGFzdE5hbWU7XG5cblx0XHRjb25zdCAkYXJyb3dOZXh0ID0gJHNsaWRlci5wYXJlbnRFbGVtZW50LnF1ZXJ5U2VsZWN0b3IoJy5hcnJvdy1uZXh0Jyk7XG5cdFx0Y29uc3QgJGFycm93UHJldiA9ICRzbGlkZXIucGFyZW50RWxlbWVudC5xdWVyeVNlbGVjdG9yKCcuYXJyb3ctcHJldicpO1xuXG5cdFx0bGV0IGN1cnJlbnQgPSAkc2xpZGVyLmZpcnN0RWxlbWVudENoaWxkO1xuXHRcdCRhcnJvd05leHQuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoKSA9PiB7XG5cdFx0XHRjb25zdCBuZXh0ID0gY3VycmVudC5uZXh0RWxlbWVudFNpYmxpbmc7XG5cdFx0XHRpZiAobmV4dCkge1xuXHRcdFx0XHRuZXh0LnNjcm9sbEludG9WaWV3KHtiZWhhdmlvcjogXCJzbW9vdGhcIiwgYmxvY2s6IFwibmVhcmVzdFwiLCBpbmxpbmU6IFwiY2VudGVyXCJ9KTtcblx0XHRcdFx0Y3VycmVudCA9IG5leHQ7XG5cdFx0XHR9XG5cdFx0fSk7XG5cblx0XHQkYXJyb3dQcmV2LmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKCkgPT4ge1xuXHRcdFx0Y29uc3QgcHJldiA9IGN1cnJlbnQucHJldmlvdXNFbGVtZW50U2libGluZztcblx0XHRcdGlmIChwcmV2KSB7XG5cdFx0XHRcdHByZXYuc2Nyb2xsSW50b1ZpZXcoe2JlaGF2aW9yOiBcInNtb290aFwiLCBibG9jazogXCJuZWFyZXN0XCIsIGlubGluZTogXCJjZW50ZXJcIn0pO1xuXHRcdFx0XHRjdXJyZW50ID0gcHJldjtcblx0XHRcdH1cblx0XHR9KVxuXHR9KTtcblxuXHRhdHRhY2hJbWFnZUxpc3RlbmVycygpO1xuXHRtYWtlQWxwaGFiZXQoKTtcbn07XG5cbi8vIHRoaXMgbmVlZHMgdG8gYmUgYSBkZWVwZXIgc29ydFxuY29uc3Qgc29ydEJ5VGl0bGUgPSAoKSA9PiB7XG5cdGVudHJpZXMuYnlUaXRsZS5zb3J0KChhLCBiKSA9PiB7XG5cdFx0bGV0IGFUaXRsZSA9IGEudGl0bGVbMF0udG9VcHBlckNhc2UoKTtcblx0XHRsZXQgYlRpdGxlID0gYi50aXRsZVswXS50b1VwcGVyQ2FzZSgpO1xuXHRcdGlmIChhVGl0bGUgPiBiVGl0bGUpIHJldHVybiAxO1xuXHRcdGVsc2UgaWYgKGFUaXRsZSA8IGJUaXRsZSkgcmV0dXJuIC0xO1xuXHRcdGVsc2UgcmV0dXJuIDA7XG5cdH0pO1xufTtcblxuY29uc3Qgc2V0RGF0YSA9IChkYXRhKSA9PiB7XG5cdGVudHJpZXMuYnlBdXRob3IgPSBkYXRhO1xuXHRlbnRyaWVzLmJ5VGl0bGUgPSBkYXRhLnNsaWNlKCk7IC8vIGNvcGllcyBkYXRhIGZvciBieVRpdGxlIHNvcnRcblx0c29ydEJ5VGl0bGUoKTtcblx0cmVuZGVyRW50cmllcygpO1xufVxuXG5jb25zdCBmZXRjaERhdGEgPSAoKSA9PiB7XG5cdFx0ZmV0Y2goREIpLnRoZW4ocmVzID0+XG5cdFx0XHRyZXMuanNvbigpXG5cdFx0KS50aGVuKGRhdGEgPT4ge1xuXHRcdFx0c2V0RGF0YShkYXRhKTtcblx0XHR9KVxuXHRcdC50aGVuKCgpID0+IHtcblx0XHRcdCRsb2FkaW5nLmZvckVhY2goZWxlbSA9PiBlbGVtLmNsYXNzTGlzdC5hZGQoJ3JlYWR5JykpO1xuXHRcdFx0JG5hdi5jbGFzc0xpc3QuYWRkKCdyZWFkeScpO1xuXHRcdH0pXG5cdFx0LmNhdGNoKGVyciA9PiBjb25zb2xlLndhcm4oZXJyKSk7XG59O1xuXG5jb25zdCBpbml0ID0gKCkgPT4ge1xuXHRzbW9vdGhzY3JvbGwucG9seWZpbGwoKTtcblx0ZmV0Y2hEYXRhKCk7XG5cdG5hdkxnKCk7XG5cdHJlbmRlckVudHJpZXMoKTtcblx0YWRkU29ydEJ1dHRvbkxpc3RlbmVycygpO1xuXHRhdHRhY2hBcnJvd0xpc3RlbmVycygpO1xuXHRhdHRhY2hNb2RhbExpc3RlbmVycygpO1xufVxuXG5pbml0KCk7XG4iLCJjb25zdCBhcnRpY2xlVGVtcGxhdGUgPSBgXG5cdDxhcnRpY2xlIGNsYXNzPVwiYXJ0aWNsZV9fb3V0ZXJcIj5cblx0XHQ8ZGl2IGNsYXNzPVwiYXJ0aWNsZV9faW5uZXJcIj5cblx0XHRcdDxkaXYgY2xhc3M9XCJhcnRpY2xlX19oZWFkaW5nXCI+XG5cdFx0XHRcdDxhIGNsYXNzPVwianMtZW50cnktdGl0bGVcIj48L2E+XG5cdFx0XHRcdDxoMiBjbGFzcz1cImFydGljbGUtaGVhZGluZ19fdGl0bGVcIj48L2gyPlxuXHRcdFx0XHQ8ZGl2IGNsYXNzPVwiYXJ0aWNsZS1oZWFkaW5nX19uYW1lXCI+XG5cdFx0XHRcdFx0PHNwYW4gY2xhc3M9XCJhcnRpY2xlLWhlYWRpbmdfX25hbWUtLWZpcnN0XCI+PC9zcGFuPlxuXHRcdFx0XHRcdDxhIGNsYXNzPVwianMtZW50cnktYXJ0aXN0XCI+PC9hPlxuXHRcdFx0XHRcdDxzcGFuIGNsYXNzPVwiYXJ0aWNsZS1oZWFkaW5nX19uYW1lLS1sYXN0XCI+PC9zcGFuPlxuXHRcdFx0XHQ8L2Rpdj5cblx0XHRcdDwvZGl2Plx0XG5cdFx0XHQ8ZGl2IGNsYXNzPVwiYXJ0aWNsZV9fc2xpZGVyLW91dGVyXCI+XG5cdFx0XHRcdDxkaXYgY2xhc3M9XCJhcnRpY2xlX19zbGlkZXItaW5uZXJcIj48L2Rpdj5cblx0XHRcdFx0PGRpdiBjbGFzcz1cImFydGljbGVfX3Njcm9sbC1jb250cm9sc1wiPlxuXHRcdFx0XHRcdDxzcGFuIGNsYXNzPVwiY29udHJvbHMgYXJyb3ctcHJldlwiPuKGkDwvc3Bhbj4gXG5cdFx0XHRcdFx0PHNwYW4gY2xhc3M9XCJjb250cm9scyBhcnJvdy1uZXh0XCI+4oaSPC9zcGFuPlxuXHRcdFx0XHQ8L2Rpdj5cblx0XHRcdFx0PHAgY2xhc3M9XCJqcy1hcnRpY2xlLWFuY2hvci10YXJnZXRcIj48L3A+XG5cdFx0PC9kaXY+XG5cdDwvYXJ0aWNsZT5cbmA7XG5cbmV4cG9ydCBkZWZhdWx0IGFydGljbGVUZW1wbGF0ZTsiLCJpbXBvcnQgYXJ0aWNsZVRlbXBsYXRlIGZyb20gJy4vYXJ0aWNsZSc7XG5pbXBvcnQgbmF2TGcgZnJvbSAnLi9uYXZMZyc7XG5cbmV4cG9ydCB7IGFydGljbGVUZW1wbGF0ZSwgbmF2TGcgfTsiLCJjb25zdCB0ZW1wbGF0ZSA9IFxuXHRgPGRpdiBjbGFzcz1cIm5hdl9faW5uZXJcIj5cblx0XHQ8ZGl2IGNsYXNzPVwibmF2X19zb3J0LWJ5XCI+XG5cdFx0XHQ8c3BhbiBjbGFzcz1cInNvcnQtYnlfX3RpdGxlXCI+U29ydCBieTwvc3Bhbj5cblx0XHRcdDxidXR0b24gY2xhc3M9XCJzb3J0LWJ5IHNvcnQtYnlfX2J5LWFydGlzdCBhY3RpdmVcIiBpZD1cImpzLWJ5LWFydGlzdFwiPkFydGlzdDwvYnV0dG9uPlxuXHRcdFx0PHNwYW4gY2xhc3M9XCJzb3J0LWJ5X19kaXZpZGVyXCI+IHwgPC9zcGFuPlxuXHRcdFx0PGJ1dHRvbiBjbGFzcz1cInNvcnQtYnkgc29ydC1ieV9fYnktdGl0bGVcIiBpZD1cImpzLWJ5LXRpdGxlXCI+VGl0bGU8L2J1dHRvbj5cblx0XHRcdDxzcGFuIGNsYXNzPVwiZmluZFwiIGlkPVwianMtZmluZFwiPlxuXHRcdFx0XHQoPHNwYW4gY2xhc3M9XCJmaW5kLS1pbm5lclwiPiYjODk4NDtGPC9zcGFuPilcblx0XHRcdDwvc3Bhbj5cblx0XHQ8L2Rpdj5cblx0XHQ8ZGl2IGNsYXNzPVwibmF2X19hbHBoYWJldFwiPlxuXHRcdFx0PHNwYW4gY2xhc3M9XCJhbHBoYWJldF9fdGl0bGVcIj5HbyB0bzwvc3Bhbj5cblx0XHRcdDxkaXYgY2xhc3M9XCJhbHBoYWJldF9fbGV0dGVyc1wiPjwvZGl2PlxuXHRcdDwvZGl2PlxuXHQ8L2Rpdj5gO1xuXG5jb25zdCBuYXZMZyA9ICgpID0+IHtcblx0bGV0IG5hdk91dGVyID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2pzLW5hdicpO1xuXHRuYXZPdXRlci5pbm5lckhUTUwgPSB0ZW1wbGF0ZTtcbn07XG5cbmV4cG9ydCBkZWZhdWx0IG5hdkxnOyIsImNvbnN0IGRlYm91bmNlID0gKGZuLCB0aW1lKSA9PiB7XG4gIGxldCB0aW1lb3V0O1xuXG4gIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICBjb25zdCBmdW5jdGlvbkNhbGwgPSAoKSA9PiBmbi5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIFxuICAgIGNsZWFyVGltZW91dCh0aW1lb3V0KTtcbiAgICB0aW1lb3V0ID0gc2V0VGltZW91dChmdW5jdGlvbkNhbGwsIHRpbWUpO1xuICB9XG59O1xuXG5leHBvcnQgeyBkZWJvdW5jZSB9OyJdLCJwcmVFeGlzdGluZ0NvbW1lbnQiOiIvLyMgc291cmNlTWFwcGluZ1VSTD1kYXRhOmFwcGxpY2F0aW9uL2pzb247Y2hhcnNldD11dGYtODtiYXNlNjQsZXlKMlpYSnphVzl1SWpvekxDSnpiM1Z5WTJWeklqcGJJbTV2WkdWZmJXOWtkV3hsY3k5aWNtOTNjMlZ5TFhCaFkyc3ZYM0J5Wld4MVpHVXVhbk1pTENKdWIyUmxYMjF2WkhWc1pYTXZjMjF2YjNSb2MyTnliMnhzTFhCdmJIbG1hV3hzTDJScGMzUXZjMjF2YjNSb2MyTnliMnhzTG1weklpd2ljM0pqTDJwekwybHVaR1Y0TG1weklpd2ljM0pqTDJwekwzUmxiWEJzWVhSbGN5OWhjblJwWTJ4bExtcHpJaXdpYzNKakwycHpMM1JsYlhCc1lYUmxjeTlwYm1SbGVDNXFjeUlzSW5OeVl5OXFjeTkwWlcxd2JHRjBaWE12Ym1GMlRHY3Vhbk1pTENKemNtTXZhbk12ZFhScGJITXZhVzVrWlhndWFuTWlYU3dpYm1GdFpYTWlPbHRkTENKdFlYQndhVzVuY3lJNklrRkJRVUU3UVVOQlFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk96czdPMEZEZG1KQk96czdPMEZCUlVFN08wRkJRMEU3T3pzN1FVRkhRU3hKUVVGTkxFdEJRVXNzSzBaQlFWZzdRVUZEUVN4SlFVRk5MRmRCUVZjc1EwRkJReXhIUVVGRUxFVkJRVTBzUjBGQlRpeEZRVUZYTEVkQlFWZ3NSVUZCWjBJc1IwRkJhRUlzUlVGQmNVSXNSMEZCY2tJc1JVRkJNRUlzUjBGQk1VSXNSVUZCSzBJc1IwRkJMMElzUlVGQmIwTXNSMEZCY0VNc1JVRkJlVU1zUjBGQmVrTXNSVUZCT0VNc1IwRkJPVU1zUlVGQmJVUXNSMEZCYmtRc1JVRkJkMFFzUjBGQmVFUXNSVUZCTmtRc1IwRkJOMFFzUlVGQmEwVXNSMEZCYkVVc1JVRkJkVVVzUjBGQmRrVXNSVUZCTkVVc1IwRkJOVVVzUlVGQmFVWXNSMEZCYWtZc1JVRkJjMFlzUjBGQmRFWXNSVUZCTWtZc1IwRkJNMFlzUlVGQlowY3NSMEZCYUVjc1JVRkJjVWNzUjBGQmNrY3NSVUZCTUVjc1IwRkJNVWNzUlVGQkswY3NSMEZCTDBjc1JVRkJiMGdzUjBGQmNFZ3NRMEZCYWtJN08wRkJSVUVzU1VGQlRTeFhRVUZYTEUxQlFVMHNTVUZCVGl4RFFVRlhMRk5CUVZNc1owSkJRVlFzUTBGQk1FSXNWVUZCTVVJc1EwRkJXQ3hEUVVGcVFqdEJRVU5CTEVsQlFVMHNUMEZCVHl4VFFVRlRMR05CUVZRc1EwRkJkMElzVVVGQmVFSXNRMEZCWWp0QlFVTkJMRWxCUVUwc1dVRkJXU3hUUVVGVExHRkJRVlFzUTBGQmRVSXNWMEZCZGtJc1EwRkJiRUk3UVVGRFFTeEpRVUZOTEZkQlFWY3NVMEZCVXl4aFFVRlVMRU5CUVhWQ0xGVkJRWFpDTEVOQlFXcENPMEZCUTBFc1NVRkJUU3hUUVVGVExGTkJRVk1zWTBGQlZDeERRVUYzUWl4VlFVRjRRaXhEUVVGbU8wRkJRMEVzU1VGQlRTeFRRVUZUTEZOQlFWTXNZVUZCVkN4RFFVRjFRaXhSUVVGMlFpeERRVUZtTzBGQlEwRXNTVUZCVFN4VFFVRlRMRk5CUVZNc1lVRkJWQ3hEUVVGMVFpeFJRVUYyUWl4RFFVRm1PMEZCUTBFc1NVRkJUU3haUVVGWkxGTkJRVk1zWVVGQlZDeERRVUYxUWl4WFFVRjJRaXhEUVVGc1FqdEJRVU5CTEVsQlFVMHNVVUZCVVN4VFFVRlRMR0ZCUVZRc1EwRkJkVUlzWjBKQlFYWkNMRU5CUVdRN08wRkJSVUVzU1VGQlNTeFZRVUZWTEVOQlFXUXNReXhEUVVGcFFqdEJRVU5xUWl4SlFVRkpMRlZCUVZVc1JVRkJSU3hWUVVGVkxFVkJRVm9zUlVGQlowSXNVMEZCVXl4RlFVRjZRaXhGUVVGa08wRkJRMEVzU1VGQlNTeG5Ra0ZCWjBJc1IwRkJjRUk3TzBGQlJVRXNTVUZCU1N4WFFVRlhMRXRCUVdZN1FVRkRRU3hKUVVGSkxFdEJRVXNzUzBGQlZEdEJRVU5CTEVsQlFVMHNkVUpCUVhWQ0xGTkJRWFpDTEc5Q1FVRjFRaXhIUVVGTk8wRkJRMnhETEV0QlFVMHNWVUZCVlN4TlFVRk5MRWxCUVU0c1EwRkJWeXhUUVVGVExHZENRVUZVTEVOQlFUQkNMR2RDUVVFeFFpeERRVUZZTEVOQlFXaENPenRCUVVWQkxGTkJRVkVzVDBGQlVpeERRVUZuUWl4bFFVRlBPMEZCUTNSQ0xFMUJRVWtzWjBKQlFVb3NRMEZCY1VJc1QwRkJja0lzUlVGQk9FSXNWVUZCUXl4SFFVRkVMRVZCUVZNN1FVRkRkRU1zVDBGQlNTeERRVUZETEZGQlFVd3NSVUZCWlR0QlFVTmtMRkZCUVVrc1RVRkJUU3hKUVVGSkxFZEJRV1E3TzBGQlJVRXNZMEZCVlN4VFFVRldMRU5CUVc5Q0xFZEJRWEJDTEVOQlFYZENMRlZCUVhoQ08wRkJRMEVzVlVGQlRTeFpRVUZPTEVOQlFXMUNMRTlCUVc1Q0xEWkNRVUZ4UkN4SFFVRnlSRHRCUVVOQkxHVkJRVmNzU1VGQldEdEJRVU5CTzBGQlEwUXNSMEZTUkR0QlFWTkJMRVZCVmtRN08wRkJXVUVzVDBGQlRTeG5Ra0ZCVGl4RFFVRjFRaXhQUVVGMlFpeEZRVUZuUXl4WlFVRk5PMEZCUTNKRExFMUJRVWtzVVVGQlNpeEZRVUZqTzBGQlEySXNZVUZCVlN4VFFVRldMRU5CUVc5Q0xFMUJRWEJDTEVOQlFUSkNMRlZCUVROQ08wRkJRMEVzWTBGQlZ5eExRVUZZTzBGQlEwRTdRVUZEUkN4RlFVeEVPMEZCVFVFc1EwRnlRa1E3TzBGQmRVSkJMRWxCUVVrc1VVRkJVU3hMUVVGYU8wRkJRMEVzU1VGQlRTeDFRa0ZCZFVJc1UwRkJka0lzYjBKQlFYVkNMRWRCUVUwN1FVRkRiRU1zUzBGQlRTeFJRVUZSTEZOQlFWTXNZMEZCVkN4RFFVRjNRaXhUUVVGNFFpeERRVUZrT3p0QlFVVkJMRTlCUVUwc1owSkJRVTRzUTBGQmRVSXNUMEZCZGtJc1JVRkJaME1zV1VGQlRUdEJRVU55UXl4VFFVRlBMRk5CUVZBc1EwRkJhVUlzUjBGQmFrSXNRMEZCY1VJc1RVRkJja0k3UVVGRFFTeFZRVUZSTEVsQlFWSTdRVUZEUVN4RlFVaEVPenRCUVV0QkxGRkJRVThzWjBKQlFWQXNRMEZCZDBJc1QwRkJlRUlzUlVGQmFVTXNXVUZCVFR0QlFVTjBReXhUUVVGUExGTkJRVkFzUTBGQmFVSXNUVUZCYWtJc1EwRkJkMElzVFVGQmVFSTdRVUZEUVN4VlFVRlJMRXRCUVZJN1FVRkRRU3hGUVVoRU96dEJRVXRCTEZGQlFVOHNaMEpCUVZBc1EwRkJkMElzVTBGQmVFSXNSVUZCYlVNc1dVRkJUVHRCUVVONFF5eE5RVUZKTEV0QlFVb3NSVUZCVnp0QlFVTldMR05CUVZjc1dVRkJUVHRCUVVOb1FpeFhRVUZQTEZOQlFWQXNRMEZCYVVJc1RVRkJha0lzUTBGQmQwSXNUVUZCZUVJN1FVRkRRU3haUVVGUkxFdEJRVkk3UVVGRFFTeEpRVWhFTEVWQlIwY3NSMEZJU0R0QlFVbEJPMEZCUTBRc1JVRlFSRHRCUVZGQkxFTkJja0pFT3p0QlFYVkNRU3hKUVVGTkxHTkJRV01zVTBGQlpDeFhRVUZqTEVkQlFVMDdRVUZEZWtJc1MwRkJTU3hSUVVGUkxGTkJRVk1zWTBGQlZDeERRVUYzUWl4bFFVRjRRaXhEUVVGYU8wRkJRMEVzVDBGQlRTeGpRVUZPTEVOQlFYRkNMRVZCUVVNc1ZVRkJWU3hSUVVGWUxFVkJRWEZDTEU5QlFVOHNUMEZCTlVJc1JVRkJja0k3UVVGRFFTeERRVWhFT3p0QlFVdEJMRWxCUVVrc1lVRkJTanRCUVVOQkxFbEJRVWtzVlVGQlZTeERRVUZrTzBGQlEwRXNTVUZCU1N4WlFVRlpMRXRCUVdoQ08wRkJRMEVzU1VGQlRTeDFRa0ZCZFVJc1UwRkJka0lzYjBKQlFYVkNMRWRCUVUwN1FVRkRiRU1zVVVGQlR5eG5Ra0ZCVUN4RFFVRjNRaXhQUVVGNFFpeEZRVUZwUXl4WlFVRk5PMEZCUTNSRE8wRkJRMEVzUlVGR1JEczdRVUZKUVN4WFFVRlZMR2RDUVVGV0xFTkJRVEpDTEZGQlFUTkNMRVZCUVhGRExGbEJRVTA3TzBGQlJURkRMRTFCUVVrc1NVRkJTU3hQUVVGUExIRkNRVUZRTEVkQlFTdENMRU5CUVhaRE8wRkJRMEVzVFVGQlNTeFpRVUZaTEVOQlFXaENMRVZCUVcxQ08wRkJRMnhDTEZWQlFVOHNUMEZCVUR0QlFVTkJMR0ZCUVZVc1EwRkJWanRCUVVOQk96dEJRVVZFTEUxQlFVa3NTMEZCU3l4RFFVRkRMRVZCUVU0c1NVRkJXU3hEUVVGRExGTkJRV3BDTEVWQlFUUkNPMEZCUXpOQ0xGVkJRVThzVTBGQlVDeERRVUZwUWl4SFFVRnFRaXhEUVVGeFFpeE5RVUZ5UWp0QlFVTkJMR1ZCUVZrc1NVRkJXanRCUVVOQkxFZEJTRVFzVFVGSFR5eEpRVUZKTEVsQlFVa3NRMEZCUXl4RlFVRk1MRWxCUVZjc1UwRkJaaXhGUVVFd1FqdEJRVU5vUXl4VlFVRlBMRk5CUVZBc1EwRkJhVUlzVFVGQmFrSXNRMEZCZDBJc1RVRkJlRUk3UVVGRFFTeGxRVUZaTEV0QlFWbzdRVUZEUVR0QlFVTkVMRVZCWmtRN1FVRm5Ra0VzUTBGeVFrUTdPMEZCZFVKQkxFbEJRVTBzZVVKQlFYbENMRk5CUVhwQ0xITkNRVUY1UWl4SFFVRk5PMEZCUTNCRExFdEJRVWtzV1VGQldTeFRRVUZUTEdOQlFWUXNRMEZCZDBJc1kwRkJlRUlzUTBGQmFFSTdRVUZEUVN4TFFVRkpMRmRCUVZjc1UwRkJVeXhqUVVGVUxFTkJRWGRDTEdGQlFYaENMRU5CUVdZN1FVRkRRU3hYUVVGVkxHZENRVUZXTEVOQlFUSkNMRTlCUVROQ0xFVkJRVzlETEZsQlFVMDdRVUZEZWtNc1RVRkJTU3hQUVVGS0xFVkJRV0U3UVVGRFdqdEJRVU5CTEdGQlFWVXNRMEZCVmp0QlFVTkJMR0ZCUVZVc1UwRkJWaXhEUVVGdlFpeEhRVUZ3UWl4RFFVRjNRaXhSUVVGNFFqdEJRVU5CTEZsQlFWTXNVMEZCVkN4RFFVRnRRaXhOUVVGdVFpeERRVUV3UWl4UlFVRXhRanM3UVVGRlFUdEJRVU5CTzBGQlEwUXNSVUZVUkRzN1FVRlhRU3hWUVVGVExHZENRVUZVTEVOQlFUQkNMRTlCUVRGQ0xFVkJRVzFETEZsQlFVMDdRVUZEZUVNc1RVRkJTU3hEUVVGRExFOUJRVXdzUlVGQll6dEJRVU5pTzBGQlEwRXNZVUZCVlN4RFFVRldPMEZCUTBFc1dVRkJVeXhUUVVGVUxFTkJRVzFDTEVkQlFXNUNMRU5CUVhWQ0xGRkJRWFpDTzBGQlEwRXNZVUZCVlN4VFFVRldMRU5CUVc5Q0xFMUJRWEJDTEVOQlFUSkNMRkZCUVROQ096dEJRVVZCTzBGQlEwRTdRVUZEUkN4RlFWUkVPMEZCVlVFc1EwRjRRa1E3TzBGQk1FSkJMRWxCUVUwc1pVRkJaU3hUUVVGbUxGbEJRV1VzUTBGQlF5eFpRVUZFTEVWQlFXdENPMEZCUTNSRExFdEJRVWtzVjBGQlZ5eE5RVUZOTEVsQlFVNHNRMEZCVnl4VFFVRlRMR2RDUVVGVUxFTkJRVEJDTEZsQlFURkNMRU5CUVZnc1EwRkJaanRCUVVOQkxGVkJRVk1zVDBGQlZDeERRVUZwUWp0QlFVRkJMRk5CUVZNc1RVRkJUU3hsUVVGT0xFTkJRWE5DTEUxQlFYUkNMRU5CUVZRN1FVRkJRU3hGUVVGcVFqdEJRVU5CTEVOQlNFUTdPMEZCUzBFc1NVRkJUU3hwUWtGQmFVSXNVMEZCYWtJc1kwRkJhVUlzUTBGQlF5eEpRVUZFTEVWQlFWVTdRVUZEYUVNc1MwRkJTU3hYUVVGWExGVkJRVlVzYVVKQlFWWXNSMEZCT0VJc2EwSkJRVGRETzBGQlEwRXNTMEZCU1N4bFFVRmxMRU5CUVVNc1QwRkJSQ3hIUVVGWExHbENRVUZZTEVkQlFTdENMR3RDUVVGc1JEdEJRVU5CTEV0QlFVa3NWMEZCVnl4TlFVRk5MRWxCUVU0c1EwRkJWeXhUUVVGVExHZENRVUZVTEVOQlFUQkNMRkZCUVRGQ0xFTkJRVmdzUTBGQlpqczdRVUZGUVN4alFVRmhMRmxCUVdJN08wRkJSVUVzVVVGQlR5eFRRVUZUTEVsQlFWUXNRMEZCWXl4cFFrRkJVenRCUVVNM1FpeE5RVUZKTEU5QlFVOHNUVUZCVFN4clFrRkJha0k3UVVGRFFTeFRRVUZQTEV0QlFVc3NVMEZCVEN4RFFVRmxMRU5CUVdZc1RVRkJjMElzU1VGQmRFSXNTVUZCT0VJc1MwRkJTeXhUUVVGTUxFTkJRV1VzUTBGQlppeE5RVUZ6UWl4TFFVRkxMRmRCUVV3c1JVRkJNMFE3UVVGRFFTeEZRVWhOTEVOQlFWQTdRVUZKUVN4RFFWaEVPenRCUVdOQkxFbEJRVTBzWlVGQlpTeFRRVUZtTEZsQlFXVXNSMEZCVFR0QlFVTXhRaXhMUVVGTkxIVkNRVUYxUWl4VFFVRjJRaXh2UWtGQmRVSXNRMEZCUXl4UFFVRkVMRVZCUVZVc1RVRkJWaXhGUVVGeFFqdEJRVU5xUkN4VlFVRlJMR2RDUVVGU0xFTkJRWGxDTEU5QlFYcENMRVZCUVd0RExGbEJRVTA3UVVGRGRrTXNUMEZCVFN4aFFVRmhMRk5CUVZNc1kwRkJWQ3hEUVVGM1FpeE5RVUY0UWl4RFFVRnVRanRCUVVOQkxFOUJRVWtzWlVGQlNqczdRVUZGUVN4UFFVRkpMRU5CUVVNc1QwRkJUQ3hGUVVGak8wRkJRMklzWVVGQlV5eFhRVUZYTEVkQlFWZ3NSMEZCYVVJc1UwRkJVeXhqUVVGVUxFTkJRWGRDTEdWQlFYaENMRU5CUVdwQ0xFZEJRVFJFTEZkQlFWY3NZVUZCV0N4RFFVRjVRaXhoUVVGNlFpeERRVUYxUXl4aFFVRjJReXhEUVVGeFJDeGhRVUZ5UkN4RFFVRnRSU3h6UWtGQmJrVXNRMEZCTUVZc1lVRkJNVVlzUTBGQmQwY3NNa0pCUVhoSExFTkJRWEpGTzBGQlEwRXNTVUZHUkN4TlFVVlBPMEZCUTA0c1lVRkJVeXhYUVVGWExFZEJRVmdzUjBGQmFVSXNVMEZCVXl4alFVRlVMRU5CUVhkQ0xHVkJRWGhDTEVOQlFXcENMRWRCUVRSRUxGZEJRVmNzWVVGQldDeERRVUY1UWl4aFFVRjZRaXhEUVVGMVF5eGhRVUYyUXl4RFFVRnhSQ3h6UWtGQmNrUXNRMEZCTkVVc1lVRkJOVVVzUTBGQk1FWXNNa0pCUVRGR0xFTkJRWEpGTzBGQlEwRTdPMEZCUlVRc1ZVRkJUeXhqUVVGUUxFTkJRWE5DTEVWQlFVTXNWVUZCVlN4UlFVRllMRVZCUVhGQ0xFOUJRVThzVDBGQk5VSXNSVUZCZEVJN1FVRkRRU3hIUVZoRU8wRkJXVUVzUlVGaVJEczdRVUZsUVN4TFFVRkpMR2RDUVVGblFpeEZRVUZ3UWp0QlFVTkJMRXRCUVVrc1UwRkJVeXhUUVVGVExHRkJRVlFzUTBGQmRVSXNiMEpCUVhaQ0xFTkJRV0k3UVVGRFFTeFJRVUZQTEZOQlFWQXNSMEZCYlVJc1JVRkJia0k3TzBGQlJVRXNWVUZCVXl4UFFVRlVMRU5CUVdsQ0xHdENRVUZWTzBGQlF6RkNMRTFCUVVrc1kwRkJZeXhsUVVGbExFMUJRV1lzUTBGQmJFSTdRVUZEUVN4TlFVRkpMRlZCUVZVc1UwRkJVeXhoUVVGVUxFTkJRWFZDTEVkQlFYWkNMRU5CUVdRN08wRkJSVUVzVFVGQlNTeERRVUZETEZkQlFVd3NSVUZCYTBJN08wRkJSV3hDTEdOQlFWa3NSVUZCV2l4SFFVRnBRaXhOUVVGcVFqdEJRVU5CTEZWQlFWRXNVMEZCVWl4SFFVRnZRaXhQUVVGUExGZEJRVkFzUlVGQmNFSTdRVUZEUVN4VlFVRlJMRk5CUVZJc1IwRkJiMElzZVVKQlFYQkNPenRCUVVWQkxIVkNRVUZ4UWl4UFFVRnlRaXhGUVVFNFFpeE5RVUU1UWp0QlFVTkJMRk5CUVU4c1YwRkJVQ3hEUVVGdFFpeFBRVUZ1UWp0QlFVTkJMRVZCV2tRN1FVRmhRU3hEUVdwRFJEczdRVUZ0UTBFc1NVRkJUU3hsUVVGbExGTkJRV1lzV1VGQlpTeERRVUZETEUxQlFVUXNSVUZCVXl4UFFVRlVMRVZCUVhGQ08wRkJRM3BETEZGQlFVOHNUMEZCVUN4RFFVRmxMR2xDUVVGVE8wRkJRM1pDTEUxQlFVMHNLMEpCUVRaQ0xFdEJRVzVETzBGQlEwRXNUVUZCVFN4WlFVRlpMRk5CUVZNc1lVRkJWQ3hEUVVGMVFpeExRVUYyUWl4RFFVRnNRanRCUVVOQkxFMUJRVTBzVDBGQlR5eFRRVUZUTEdGQlFWUXNRMEZCZFVJc1MwRkJka0lzUTBGQllqdEJRVU5CTEU5QlFVc3NVMEZCVEN4SFFVRnBRaXhsUVVGcVFqdEJRVU5CTEU5QlFVc3NSMEZCVEN4SFFVRlhMRWRCUVZnN1FVRkRRU3haUVVGVkxGZEJRVllzUTBGQmMwSXNTVUZCZEVJN1FVRkRRU3hWUVVGUkxGZEJRVklzUTBGQmIwSXNVMEZCY0VJN1FVRkRRU3hGUVZKRU8wRkJVMEVzUTBGV1JEczdRVUZaUVN4SlFVRk5MR2RDUVVGblFpeFRRVUZvUWl4aFFVRm5RaXhIUVVGTk8wRkJRek5DTEV0QlFVMHNaVUZCWlN4VFFVRlRMR05CUVZRc1EwRkJkMElzVTBGQmVFSXNRMEZCY2tJN1FVRkRRU3hMUVVGTkxHTkJRV01zVlVGQlZTeFJRVUZSTEU5QlFXeENMRWRCUVRSQ0xGRkJRVkVzVVVGQmVFUTdPMEZCUlVFc1kwRkJZU3hUUVVGaUxFZEJRWGxDTEVWQlFYcENPenRCUVVWQkxHRkJRVmtzVDBGQldpeERRVUZ2UWl4cFFrRkJVenRCUVVGQkxFMUJRM0JDTEV0QlJHOUNMRWRCUTNkRExFdEJSSGhETEVOQlEzQkNMRXRCUkc5Q08wRkJRVUVzVFVGRFlpeFJRVVJoTEVkQlEzZERMRXRCUkhoRExFTkJRMklzVVVGRVlUdEJRVUZCTEUxQlEwZ3NVMEZFUnl4SFFVTjNReXhMUVVSNFF5eERRVU5JTEZOQlJFYzdRVUZCUVN4TlFVTlJMRTFCUkZJc1IwRkRkME1zUzBGRWVFTXNRMEZEVVN4TlFVUlNPMEZCUVVFc1RVRkRaMElzVjBGRWFFSXNSMEZEZDBNc1MwRkVlRU1zUTBGRFowSXNWMEZFYUVJN1FVRkJRU3hOUVVNMlFpeE5RVVEzUWl4SFFVTjNReXhMUVVSNFF5eERRVU0yUWl4TlFVUTNRanM3TzBGQlJ6VkNMR1ZCUVdFc2EwSkJRV0lzUTBGQlowTXNWMEZCYUVNc1JVRkJOa01zTUVKQlFUZERPenRCUVVWQkxFMUJRVTBzWTBGQll5eFRRVUZUTEdkQ1FVRlVMRU5CUVRCQ0xIZENRVUV4UWl4RFFVRndRanRCUVVOQkxFMUJRVTBzVlVGQlZTeFpRVUZaTEZsQlFWa3NUVUZCV2l4SFFVRnhRaXhEUVVGcVF5eERRVUZvUWp0QlFVTkJPenRCUVVWQkxFMUJRVWtzVDBGQlR5eE5RVUZZTEVWQlFXMUNMR0ZCUVdFc1RVRkJZaXhGUVVGeFFpeFBRVUZ5UWpzN1FVRkZia0lzVFVGQlRTeHZRa0ZCYjBJc1UwRkJVeXhoUVVGVUxFTkJRWFZDTEV0QlFYWkNMRU5CUVRGQ08wRkJRMEVzVFVGQlRTeHRRa0ZCYlVJc1UwRkJVeXhoUVVGVUxFTkJRWFZDTEVkQlFYWkNMRU5CUVhwQ08wRkJRMEVzVFVGQlRTeGpRVUZqTEZOQlFWTXNZVUZCVkN4RFFVRjFRaXhIUVVGMlFpeERRVUZ3UWp0QlFVTkJMRzlDUVVGclFpeFRRVUZzUWl4RFFVRTBRaXhIUVVFMVFpeERRVUZuUXl3MFFrRkJhRU03UVVGRFFTeHRRa0ZCYVVJc1UwRkJha0lzUTBGQk1rSXNSMEZCTTBJc1EwRkJLMElzY1VKQlFTOUNPMEZCUTBFc1kwRkJXU3hUUVVGYUxFTkJRWE5DTEVkQlFYUkNMRU5CUVRCQ0xHZENRVUV4UWpzN1FVRkZRU3h0UWtGQmFVSXNVMEZCYWtJc1IwRkJOa0lzVjBGQk4wSTdRVUZEUVN4alFVRlpMRk5CUVZvc1IwRkJkMElzVFVGQmVFSTdPMEZCUlVFc2IwSkJRV3RDTEZkQlFXeENMRU5CUVRoQ0xHZENRVUU1UWl4RlFVRm5SQ3hYUVVGb1JEdEJRVU5CTEZWQlFWRXNWMEZCVWl4RFFVRnZRaXhwUWtGQmNFSTdPMEZCUlVFc1RVRkJUU3hqUVVGakxGTkJRVk1zWjBKQlFWUXNRMEZCTUVJc2VVSkJRVEZDTEVOQlFYQkNPMEZCUTBFc1RVRkJUU3hUUVVGVExGbEJRVmtzV1VGQldTeE5RVUZhTEVkQlFYRkNMRU5CUVdwRExFTkJRV1k3TzBGQlJVRXNUVUZCVFN4alFVRmpMRk5CUVZNc1owSkJRVlFzUTBGQk1FSXNLMEpCUVRGQ0xFTkJRWEJDTzBGQlEwRXNUVUZCVFN4VFFVRlRMRmxCUVZrc1dVRkJXU3hOUVVGYUxFZEJRWEZDTEVOQlFXcERMRU5CUVdZN08wRkJSVUVzVFVGQlRTeGhRVUZoTEZOQlFWTXNaMEpCUVZRc1EwRkJNRUlzT0VKQlFURkNMRU5CUVc1Q08wRkJRMEVzVFVGQlRTeFJRVUZSTEZkQlFWY3NWMEZCVnl4TlFVRllMRWRCUVc5Q0xFTkJRUzlDTEVOQlFXUTdPMEZCUlVFc1UwRkJUeXhUUVVGUUxFZEJRVzFDTEV0QlFXNUNPMEZCUTBFc1UwRkJUeXhUUVVGUUxFZEJRVzFDTEZOQlFXNUNPMEZCUTBFc1VVRkJUU3hUUVVGT0xFZEJRV3RDTEZGQlFXeENPenRCUVVWQkxFMUJRVTBzWVVGQllTeFJRVUZSTEdGQlFWSXNRMEZCYzBJc1lVRkJkRUlzUTBGQmIwTXNZVUZCY0VNc1EwRkJia0k3UVVGRFFTeE5RVUZOTEdGQlFXRXNVVUZCVVN4aFFVRlNMRU5CUVhOQ0xHRkJRWFJDTEVOQlFXOURMR0ZCUVhCRExFTkJRVzVDT3p0QlFVVkJMRTFCUVVrc1ZVRkJWU3hSUVVGUkxHbENRVUYwUWp0QlFVTkJMR0ZCUVZjc1owSkJRVmdzUTBGQk5FSXNUMEZCTlVJc1JVRkJjVU1zV1VGQlRUdEJRVU14UXl4UFFVRk5MRTlCUVU4c1VVRkJVU3hyUWtGQmNrSTdRVUZEUVN4UFFVRkpMRWxCUVVvc1JVRkJWVHRCUVVOVUxGTkJRVXNzWTBGQlRDeERRVUZ2UWl4RlFVRkRMRlZCUVZVc1VVRkJXQ3hGUVVGeFFpeFBRVUZQTEZOQlFUVkNMRVZCUVhWRExGRkJRVkVzVVVGQkwwTXNSVUZCY0VJN1FVRkRRU3hqUVVGVkxFbEJRVlk3UVVGRFFUdEJRVU5FTEVkQlRrUTdPMEZCVVVFc1lVRkJWeXhuUWtGQldDeERRVUUwUWl4UFFVRTFRaXhGUVVGeFF5eFpRVUZOTzBGQlF6RkRMRTlCUVUwc1QwRkJUeXhSUVVGUkxITkNRVUZ5UWp0QlFVTkJMRTlCUVVrc1NVRkJTaXhGUVVGVk8wRkJRMVFzVTBGQlN5eGpRVUZNTEVOQlFXOUNMRVZCUVVNc1ZVRkJWU3hSUVVGWUxFVkJRWEZDTEU5QlFVOHNVMEZCTlVJc1JVRkJkVU1zVVVGQlVTeFJRVUV2UXl4RlFVRndRanRCUVVOQkxHTkJRVlVzU1VGQlZqdEJRVU5CTzBGQlEwUXNSMEZPUkR0QlFVOUJMRVZCZUVSRU96dEJRVEJFUVR0QlFVTkJPMEZCUTBFc1EwRnNSVVE3TzBGQmIwVkJPMEZCUTBFc1NVRkJUU3hqUVVGakxGTkJRV1FzVjBGQll5eEhRVUZOTzBGQlEzcENMRk5CUVZFc1QwRkJVaXhEUVVGblFpeEpRVUZvUWl4RFFVRnhRaXhWUVVGRExFTkJRVVFzUlVGQlNTeERRVUZLTEVWQlFWVTdRVUZET1VJc1RVRkJTU3hUUVVGVExFVkJRVVVzUzBGQlJpeERRVUZSTEVOQlFWSXNSVUZCVnl4WFFVRllMRVZCUVdJN1FVRkRRU3hOUVVGSkxGTkJRVk1zUlVGQlJTeExRVUZHTEVOQlFWRXNRMEZCVWl4RlFVRlhMRmRCUVZnc1JVRkJZanRCUVVOQkxFMUJRVWtzVTBGQlV5eE5RVUZpTEVWQlFYRkNMRTlCUVU4c1EwRkJVQ3hEUVVGeVFpeExRVU5MTEVsQlFVa3NVMEZCVXl4TlFVRmlMRVZCUVhGQ0xFOUJRVThzUTBGQlF5eERRVUZTTEVOQlFYSkNMRXRCUTBFc1QwRkJUeXhEUVVGUU8wRkJRMHdzUlVGT1JEdEJRVTlCTEVOQlVrUTdPMEZCVlVFc1NVRkJUU3hWUVVGVkxGTkJRVllzVDBGQlZTeERRVUZETEVsQlFVUXNSVUZCVlR0QlFVTjZRaXhUUVVGUkxGRkJRVklzUjBGQmJVSXNTVUZCYmtJN1FVRkRRU3hUUVVGUkxFOUJRVklzUjBGQmEwSXNTMEZCU3l4TFFVRk1MRVZCUVd4Q0xFTkJSbmxDTEVOQlJVODdRVUZEYUVNN1FVRkRRVHRCUVVOQkxFTkJURVE3TzBGQlQwRXNTVUZCVFN4WlFVRlpMRk5CUVZvc1UwRkJXU3hIUVVGTk8wRkJRM1JDTEU5QlFVMHNSVUZCVGl4RlFVRlZMRWxCUVZZc1EwRkJaVHRCUVVGQkxGTkJRMlFzU1VGQlNTeEpRVUZLTEVWQlJHTTdRVUZCUVN4RlFVRm1MRVZCUlVVc1NVRkdSaXhEUVVWUExHZENRVUZSTzBGQlEyUXNWVUZCVVN4SlFVRlNPMEZCUTBFc1JVRktSQ3hGUVV0RExFbEJURVFzUTBGTFRTeFpRVUZOTzBGQlExZ3NWMEZCVXl4UFFVRlVMRU5CUVdsQ08wRkJRVUVzVlVGQlVTeExRVUZMTEZOQlFVd3NRMEZCWlN4SFFVRm1MRU5CUVcxQ0xFOUJRVzVDTEVOQlFWSTdRVUZCUVN4SFFVRnFRanRCUVVOQkxFOUJRVXNzVTBGQlRDeERRVUZsTEVkQlFXWXNRMEZCYlVJc1QwRkJia0k3UVVGRFFTeEZRVkpFTEVWQlUwTXNTMEZVUkN4RFFWTlBPMEZCUVVFc1UwRkJUeXhSUVVGUkxFbEJRVklzUTBGQllTeEhRVUZpTEVOQlFWQTdRVUZCUVN4RlFWUlFPMEZCVlVRc1EwRllSRHM3UVVGaFFTeEpRVUZOTEU5QlFVOHNVMEZCVUN4SlFVRlBMRWRCUVUwN1FVRkRiRUlzWjBOQlFXRXNVVUZCWWp0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTEVOQlVrUTdPMEZCVlVFN096czdPenM3TzBGRGFGUkJMRWxCUVUwc09EQkNRVUZPT3p0clFrRjFRbVVzWlRzN096czdPenM3T3p0QlEzWkNaanM3T3p0QlFVTkJPenM3T3pzN1VVRkZVeXhsTEVkQlFVRXNhVUk3VVVGQmFVSXNTeXhIUVVGQkxHVTdPenM3T3pzN08wRkRTREZDTEVsQlFVMHNiVzFDUVVGT096dEJRV2xDUVN4SlFVRk5MRkZCUVZFc1UwRkJVaXhMUVVGUkxFZEJRVTA3UVVGRGJrSXNTMEZCU1N4WFFVRlhMRk5CUVZNc1kwRkJWQ3hEUVVGM1FpeFJRVUY0UWl4RFFVRm1PMEZCUTBFc1ZVRkJVeXhUUVVGVUxFZEJRWEZDTEZGQlFYSkNPMEZCUTBFc1EwRklSRHM3YTBKQlMyVXNTenM3T3pzN096czdRVU4wUW1Zc1NVRkJUU3hYUVVGWExGTkJRVmdzVVVGQlZ5eERRVUZETEVWQlFVUXNSVUZCU3l4SlFVRk1MRVZCUVdNN1FVRkROMElzVFVGQlNTeG5Ra0ZCU2pzN1FVRkZRU3hUUVVGUExGbEJRVmM3UVVGQlFUdEJRVUZCT3p0QlFVTm9RaXhSUVVGTkxHVkJRV1VzVTBGQlppeFpRVUZsTzBGQlFVRXNZVUZCVFN4SFFVRkhMRXRCUVVnc1EwRkJVeXhMUVVGVUxFVkJRV1VzVlVGQlppeERRVUZPTzBGQlFVRXNTMEZCY2tJN08wRkJSVUVzYVVKQlFXRXNUMEZCWWp0QlFVTkJMR05CUVZVc1YwRkJWeXhaUVVGWUxFVkJRWGxDTEVsQlFYcENMRU5CUVZZN1FVRkRSQ3hIUVV4RU8wRkJUVVFzUTBGVVJEczdVVUZYVXl4UkxFZEJRVUVzVVNJc0ltWnBiR1VpT2lKblpXNWxjbUYwWldRdWFuTWlMQ0p6YjNWeVkyVlNiMjkwSWpvaUlpd2ljMjkxY21ObGMwTnZiblJsYm5RaU9sc2lLR1oxYm1OMGFXOXVLQ2w3Wm5WdVkzUnBiMjRnY2lobExHNHNkQ2w3Wm5WdVkzUnBiMjRnYnlocExHWXBlMmxtS0NGdVcybGRLWHRwWmlnaFpWdHBYU2w3ZG1GeUlHTTlYQ0ptZFc1amRHbHZibHdpUFQxMGVYQmxiMllnY21WeGRXbHlaU1ltY21WeGRXbHlaVHRwWmlnaFppWW1ZeWx5WlhSMWNtNGdZeWhwTENFd0tUdHBaaWgxS1hKbGRIVnliaUIxS0drc0lUQXBPM1poY2lCaFBXNWxkeUJGY25KdmNpaGNJa05oYm01dmRDQm1hVzVrSUcxdlpIVnNaU0FuWENJcmFTdGNJaWRjSWlrN2RHaHliM2NnWVM1amIyUmxQVndpVFU5RVZVeEZYMDVQVkY5R1QxVk9SRndpTEdGOWRtRnlJSEE5Ymx0cFhUMTdaWGh3YjNKMGN6cDdmWDA3WlZ0cFhWc3dYUzVqWVd4c0tIQXVaWGh3YjNKMGN5eG1kVzVqZEdsdmJpaHlLWHQyWVhJZ2JqMWxXMmxkV3pGZFczSmRPM0psZEhWeWJpQnZLRzU4ZkhJcGZTeHdMSEF1Wlhod2IzSjBjeXh5TEdVc2JpeDBLWDF5WlhSMWNtNGdibHRwWFM1bGVIQnZjblJ6ZldadmNpaDJZWElnZFQxY0ltWjFibU4wYVc5dVhDSTlQWFI1Y0dWdlppQnlaWEYxYVhKbEppWnlaWEYxYVhKbExHazlNRHRwUEhRdWJHVnVaM1JvTzJrckt5bHZLSFJiYVYwcE8zSmxkSFZ5YmlCdmZYSmxkSFZ5YmlCeWZTa29LU0lzSWk4cUlITnRiMjkwYUhOamNtOXNiQ0IyTUM0MExqQWdMU0F5TURFNElDMGdSSFZ6ZEdGdUlFdGhjM1JsYml3Z1NtVnlaVzFwWVhNZ1RXVnVhV05vWld4c2FTQXRJRTFKVkNCTWFXTmxibk5sSUNvdlhHNG9ablZ1WTNScGIyNGdLQ2tnZTF4dUlDQW5kWE5sSUhOMGNtbGpkQ2M3WEc1Y2JpQWdMeThnY0c5c2VXWnBiR3hjYmlBZ1puVnVZM1JwYjI0Z2NHOXNlV1pwYkd3b0tTQjdYRzRnSUNBZ0x5OGdZV3hwWVhObGMxeHVJQ0FnSUhaaGNpQjNJRDBnZDJsdVpHOTNPMXh1SUNBZ0lIWmhjaUJrSUQwZ1pHOWpkVzFsYm5RN1hHNWNiaUFnSUNBdkx5QnlaWFIxY200Z2FXWWdjMk55YjJ4c0lHSmxhR0YyYVc5eUlHbHpJSE4xY0hCdmNuUmxaQ0JoYm1RZ2NHOXNlV1pwYkd3Z2FYTWdibTkwSUdadmNtTmxaRnh1SUNBZ0lHbG1JQ2hjYmlBZ0lDQWdJQ2R6WTNKdmJHeENaV2hoZG1sdmNpY2dhVzRnWkM1a2IyTjFiV1Z1ZEVWc1pXMWxiblF1YzNSNWJHVWdKaVpjYmlBZ0lDQWdJSGN1WDE5bWIzSmpaVk50YjI5MGFGTmpjbTlzYkZCdmJIbG1hV3hzWDE4Z0lUMDlJSFJ5ZFdWY2JpQWdJQ0FwSUh0Y2JpQWdJQ0FnSUhKbGRIVnlianRjYmlBZ0lDQjlYRzVjYmlBZ0lDQXZMeUJuYkc5aVlXeHpYRzRnSUNBZ2RtRnlJRVZzWlcxbGJuUWdQU0IzTGtoVVRVeEZiR1Z0Wlc1MElIeDhJSGN1Uld4bGJXVnVkRHRjYmlBZ0lDQjJZWElnVTBOU1QweE1YMVJKVFVVZ1BTQTBOamc3WEc1Y2JpQWdJQ0F2THlCdlltcGxZM1FnWjJGMGFHVnlhVzVuSUc5eWFXZHBibUZzSUhOamNtOXNiQ0J0WlhSb2IyUnpYRzRnSUNBZ2RtRnlJRzl5YVdkcGJtRnNJRDBnZTF4dUlDQWdJQ0FnYzJOeWIyeHNPaUIzTG5OamNtOXNiQ0I4ZkNCM0xuTmpjbTlzYkZSdkxGeHVJQ0FnSUNBZ2MyTnliMnhzUW5rNklIY3VjMk55YjJ4c1Fua3NYRzRnSUNBZ0lDQmxiR1Z0Wlc1MFUyTnliMnhzT2lCRmJHVnRaVzUwTG5CeWIzUnZkSGx3WlM1elkzSnZiR3dnZkh3Z2MyTnliMnhzUld4bGJXVnVkQ3hjYmlBZ0lDQWdJSE5qY205c2JFbHVkRzlXYVdWM09pQkZiR1Z0Wlc1MExuQnliM1J2ZEhsd1pTNXpZM0p2Ykd4SmJuUnZWbWxsZDF4dUlDQWdJSDA3WEc1Y2JpQWdJQ0F2THlCa1pXWnBibVVnZEdsdGFXNW5JRzFsZEdodlpGeHVJQ0FnSUhaaGNpQnViM2NnUFZ4dUlDQWdJQ0FnZHk1d1pYSm1iM0p0WVc1alpTQW1KaUIzTG5CbGNtWnZjbTFoYm1ObExtNXZkMXh1SUNBZ0lDQWdJQ0EvSUhjdWNHVnlabTl5YldGdVkyVXVibTkzTG1KcGJtUW9keTV3WlhKbWIzSnRZVzVqWlNsY2JpQWdJQ0FnSUNBZ09pQkVZWFJsTG01dmR6dGNibHh1SUNBZ0lDOHFLbHh1SUNBZ0lDQXFJR2x1WkdsallYUmxjeUJwWmlCaElIUm9aU0JqZFhKeVpXNTBJR0p5YjNkelpYSWdhWE1nYldGa1pTQmllU0JOYVdOeWIzTnZablJjYmlBZ0lDQWdLaUJBYldWMGFHOWtJR2x6VFdsamNtOXpiMlowUW5KdmQzTmxjbHh1SUNBZ0lDQXFJRUJ3WVhKaGJTQjdVM1J5YVc1bmZTQjFjMlZ5UVdkbGJuUmNiaUFnSUNBZ0tpQkFjbVYwZFhKdWN5QjdRbTl2YkdWaGJuMWNiaUFnSUNBZ0tpOWNiaUFnSUNCbWRXNWpkR2x2YmlCcGMwMXBZM0p2YzI5bWRFSnliM2R6WlhJb2RYTmxja0ZuWlc1MEtTQjdYRzRnSUNBZ0lDQjJZWElnZFhObGNrRm5aVzUwVUdGMGRHVnlibk1nUFNCYkowMVRTVVVnSnl3Z0oxUnlhV1JsYm5Rdkp5d2dKMFZrWjJVdkoxMDdYRzVjYmlBZ0lDQWdJSEpsZEhWeWJpQnVaWGNnVW1WblJYaHdLSFZ6WlhKQloyVnVkRkJoZEhSbGNtNXpMbXB2YVc0b0ozd25LU2t1ZEdWemRDaDFjMlZ5UVdkbGJuUXBPMXh1SUNBZ0lIMWNibHh1SUNBZ0lDOHFYRzRnSUNBZ0lDb2dTVVVnYUdGeklISnZkVzVrYVc1bklHSjFaeUJ5YjNWdVpHbHVaeUJrYjNkdUlHTnNhV1Z1ZEVobGFXZG9kQ0JoYm1RZ1kyeHBaVzUwVjJsa2RHZ2dZVzVrWEc0Z0lDQWdJQ29nY205MWJtUnBibWNnZFhBZ2MyTnliMnhzU0dWcFoyaDBJR0Z1WkNCelkzSnZiR3hYYVdSMGFDQmpZWFZ6YVc1bklHWmhiSE5sSUhCdmMybDBhWFpsYzF4dUlDQWdJQ0FxSUc5dUlHaGhjMU5qY205c2JHRmliR1ZUY0dGalpWeHVJQ0FnSUNBcUwxeHVJQ0FnSUhaaGNpQlNUMVZPUkVsT1IxOVVUMHhGVWtGT1EwVWdQU0JwYzAxcFkzSnZjMjltZEVKeWIzZHpaWElvZHk1dVlYWnBaMkYwYjNJdWRYTmxja0ZuWlc1MEtTQS9JREVnT2lBd08xeHVYRzRnSUNBZ0x5b3FYRzRnSUNBZ0lDb2dZMmhoYm1kbGN5QnpZM0p2Ykd3Z2NHOXphWFJwYjI0Z2FXNXphV1JsSUdGdUlHVnNaVzFsYm5SY2JpQWdJQ0FnS2lCQWJXVjBhRzlrSUhOamNtOXNiRVZzWlcxbGJuUmNiaUFnSUNBZ0tpQkFjR0Z5WVcwZ2UwNTFiV0psY24wZ2VGeHVJQ0FnSUNBcUlFQndZWEpoYlNCN1RuVnRZbVZ5ZlNCNVhHNGdJQ0FnSUNvZ1FISmxkSFZ5Ym5NZ2UzVnVaR1ZtYVc1bFpIMWNiaUFnSUNBZ0tpOWNiaUFnSUNCbWRXNWpkR2x2YmlCelkzSnZiR3hGYkdWdFpXNTBLSGdzSUhrcElIdGNiaUFnSUNBZ0lIUm9hWE11YzJOeWIyeHNUR1ZtZENBOUlIZzdYRzRnSUNBZ0lDQjBhR2x6TG5OamNtOXNiRlJ2Y0NBOUlIazdYRzRnSUNBZ2ZWeHVYRzRnSUNBZ0x5b3FYRzRnSUNBZ0lDb2djbVYwZFhKdWN5QnlaWE4xYkhRZ2IyWWdZWEJ3YkhscGJtY2daV0Z6WlNCdFlYUm9JR1oxYm1OMGFXOXVJSFJ2SUdFZ2JuVnRZbVZ5WEc0Z0lDQWdJQ29nUUcxbGRHaHZaQ0JsWVhObFhHNGdJQ0FnSUNvZ1FIQmhjbUZ0SUh0T2RXMWlaWEo5SUd0Y2JpQWdJQ0FnS2lCQWNtVjBkWEp1Y3lCN1RuVnRZbVZ5ZlZ4dUlDQWdJQ0FxTDF4dUlDQWdJR1oxYm1OMGFXOXVJR1ZoYzJVb2F5a2dlMXh1SUNBZ0lDQWdjbVYwZFhKdUlEQXVOU0FxSUNneElDMGdUV0YwYUM1amIzTW9UV0YwYUM1UVNTQXFJR3NwS1R0Y2JpQWdJQ0I5WEc1Y2JpQWdJQ0F2S2lwY2JpQWdJQ0FnS2lCcGJtUnBZMkYwWlhNZ2FXWWdZU0J6Ylc5dmRHZ2dZbVZvWVhacGIzSWdjMmh2ZFd4a0lHSmxJR0Z3Y0d4cFpXUmNiaUFnSUNBZ0tpQkFiV1YwYUc5a0lITm9iM1ZzWkVKaGFXeFBkWFJjYmlBZ0lDQWdLaUJBY0dGeVlXMGdlMDUxYldKbGNueFBZbXBsWTNSOUlHWnBjbk4wUVhKblhHNGdJQ0FnSUNvZ1FISmxkSFZ5Ym5NZ2UwSnZiMnhsWVc1OVhHNGdJQ0FnSUNvdlhHNGdJQ0FnWm5WdVkzUnBiMjRnYzJodmRXeGtRbUZwYkU5MWRDaG1hWEp6ZEVGeVp5a2dlMXh1SUNBZ0lDQWdhV1lnS0Z4dUlDQWdJQ0FnSUNCbWFYSnpkRUZ5WnlBOVBUMGdiblZzYkNCOGZGeHVJQ0FnSUNBZ0lDQjBlWEJsYjJZZ1ptbHljM1JCY21jZ0lUMDlJQ2R2WW1wbFkzUW5JSHg4WEc0Z0lDQWdJQ0FnSUdacGNuTjBRWEpuTG1KbGFHRjJhVzl5SUQwOVBTQjFibVJsWm1sdVpXUWdmSHhjYmlBZ0lDQWdJQ0FnWm1seWMzUkJjbWN1WW1Wb1lYWnBiM0lnUFQwOUlDZGhkWFJ2SnlCOGZGeHVJQ0FnSUNBZ0lDQm1hWEp6ZEVGeVp5NWlaV2hoZG1sdmNpQTlQVDBnSjJsdWMzUmhiblFuWEc0Z0lDQWdJQ0FwSUh0Y2JpQWdJQ0FnSUNBZ0x5OGdabWx5YzNRZ1lYSm5kVzFsYm5RZ2FYTWdibTkwSUdGdUlHOWlhbVZqZEM5dWRXeHNYRzRnSUNBZ0lDQWdJQzh2SUc5eUlHSmxhR0YyYVc5eUlHbHpJR0YxZEc4c0lHbHVjM1JoYm5RZ2IzSWdkVzVrWldacGJtVmtYRzRnSUNBZ0lDQWdJSEpsZEhWeWJpQjBjblZsTzF4dUlDQWdJQ0FnZlZ4dVhHNGdJQ0FnSUNCcFppQW9kSGx3Wlc5bUlHWnBjbk4wUVhKbklEMDlQU0FuYjJKcVpXTjBKeUFtSmlCbWFYSnpkRUZ5Wnk1aVpXaGhkbWx2Y2lBOVBUMGdKM050YjI5MGFDY3BJSHRjYmlBZ0lDQWdJQ0FnTHk4Z1ptbHljM1FnWVhKbmRXMWxiblFnYVhNZ1lXNGdiMkpxWldOMElHRnVaQ0JpWldoaGRtbHZjaUJwY3lCemJXOXZkR2hjYmlBZ0lDQWdJQ0FnY21WMGRYSnVJR1poYkhObE8xeHVJQ0FnSUNBZ2ZWeHVYRzRnSUNBZ0lDQXZMeUIwYUhKdmR5Qmxjbkp2Y2lCM2FHVnVJR0psYUdGMmFXOXlJR2x6SUc1dmRDQnpkWEJ3YjNKMFpXUmNiaUFnSUNBZ0lIUm9jbTkzSUc1bGR5QlVlWEJsUlhKeWIzSW9YRzRnSUNBZ0lDQWdJQ2RpWldoaGRtbHZjaUJ0WlcxaVpYSWdiMllnVTJOeWIyeHNUM0IwYVc5dWN5QW5JQ3RjYmlBZ0lDQWdJQ0FnSUNCbWFYSnpkRUZ5Wnk1aVpXaGhkbWx2Y2lBclhHNGdJQ0FnSUNBZ0lDQWdKeUJwY3lCdWIzUWdZU0IyWVd4cFpDQjJZV3gxWlNCbWIzSWdaVzUxYldWeVlYUnBiMjRnVTJOeWIyeHNRbVZvWVhacGIzSXVKMXh1SUNBZ0lDQWdLVHRjYmlBZ0lDQjlYRzVjYmlBZ0lDQXZLaXBjYmlBZ0lDQWdLaUJwYm1ScFkyRjBaWE1nYVdZZ1lXNGdaV3hsYldWdWRDQm9ZWE1nYzJOeWIyeHNZV0pzWlNCemNHRmpaU0JwYmlCMGFHVWdjSEp2ZG1sa1pXUWdZWGhwYzF4dUlDQWdJQ0FxSUVCdFpYUm9iMlFnYUdGelUyTnliMnhzWVdKc1pWTndZV05sWEc0Z0lDQWdJQ29nUUhCaGNtRnRJSHRPYjJSbGZTQmxiRnh1SUNBZ0lDQXFJRUJ3WVhKaGJTQjdVM1J5YVc1bmZTQmhlR2x6WEc0Z0lDQWdJQ29nUUhKbGRIVnlibk1nZTBKdmIyeGxZVzU5WEc0Z0lDQWdJQ292WEc0Z0lDQWdablZ1WTNScGIyNGdhR0Z6VTJOeWIyeHNZV0pzWlZOd1lXTmxLR1ZzTENCaGVHbHpLU0I3WEc0Z0lDQWdJQ0JwWmlBb1lYaHBjeUE5UFQwZ0oxa25LU0I3WEc0Z0lDQWdJQ0FnSUhKbGRIVnliaUJsYkM1amJHbGxiblJJWldsbmFIUWdLeUJTVDFWT1JFbE9SMTlVVDB4RlVrRk9RMFVnUENCbGJDNXpZM0p2Ykd4SVpXbG5hSFE3WEc0Z0lDQWdJQ0I5WEc1Y2JpQWdJQ0FnSUdsbUlDaGhlR2x6SUQwOVBTQW5XQ2NwSUh0Y2JpQWdJQ0FnSUNBZ2NtVjBkWEp1SUdWc0xtTnNhV1Z1ZEZkcFpIUm9JQ3NnVWs5VlRrUkpUa2RmVkU5TVJWSkJUa05GSUR3Z1pXd3VjMk55YjJ4c1YybGtkR2c3WEc0Z0lDQWdJQ0I5WEc0Z0lDQWdmVnh1WEc0Z0lDQWdMeW9xWEc0Z0lDQWdJQ29nYVc1a2FXTmhkR1Z6SUdsbUlHRnVJR1ZzWlcxbGJuUWdhR0Z6SUdFZ2MyTnliMnhzWVdKc1pTQnZkbVZ5Wm14dmR5QndjbTl3WlhKMGVTQnBiaUIwYUdVZ1lYaHBjMXh1SUNBZ0lDQXFJRUJ0WlhSb2IyUWdZMkZ1VDNabGNtWnNiM2RjYmlBZ0lDQWdLaUJBY0dGeVlXMGdlMDV2WkdWOUlHVnNYRzRnSUNBZ0lDb2dRSEJoY21GdElIdFRkSEpwYm1kOUlHRjRhWE5jYmlBZ0lDQWdLaUJBY21WMGRYSnVjeUI3UW05dmJHVmhibjFjYmlBZ0lDQWdLaTljYmlBZ0lDQm1kVzVqZEdsdmJpQmpZVzVQZG1WeVpteHZkeWhsYkN3Z1lYaHBjeWtnZTF4dUlDQWdJQ0FnZG1GeUlHOTJaWEptYkc5M1ZtRnNkV1VnUFNCM0xtZGxkRU52YlhCMWRHVmtVM1I1YkdVb1pXd3NJRzUxYkd3cFd5ZHZkbVZ5Wm14dmR5Y2dLeUJoZUdselhUdGNibHh1SUNBZ0lDQWdjbVYwZFhKdUlHOTJaWEptYkc5M1ZtRnNkV1VnUFQwOUlDZGhkWFJ2SnlCOGZDQnZkbVZ5Wm14dmQxWmhiSFZsSUQwOVBTQW5jMk55YjJ4c0p6dGNiaUFnSUNCOVhHNWNiaUFnSUNBdktpcGNiaUFnSUNBZ0tpQnBibVJwWTJGMFpYTWdhV1lnWVc0Z1pXeGxiV1Z1ZENCallXNGdZbVVnYzJOeWIyeHNaV1FnYVc0Z1pXbDBhR1Z5SUdGNGFYTmNiaUFnSUNBZ0tpQkFiV1YwYUc5a0lHbHpVMk55YjJ4c1lXSnNaVnh1SUNBZ0lDQXFJRUJ3WVhKaGJTQjdUbTlrWlgwZ1pXeGNiaUFnSUNBZ0tpQkFjR0Z5WVcwZ2UxTjBjbWx1WjMwZ1lYaHBjMXh1SUNBZ0lDQXFJRUJ5WlhSMWNtNXpJSHRDYjI5c1pXRnVmVnh1SUNBZ0lDQXFMMXh1SUNBZ0lHWjFibU4wYVc5dUlHbHpVMk55YjJ4c1lXSnNaU2hsYkNrZ2UxeHVJQ0FnSUNBZ2RtRnlJR2x6VTJOeWIyeHNZV0pzWlZrZ1BTQm9ZWE5UWTNKdmJHeGhZbXhsVTNCaFkyVW9aV3dzSUNkWkp5a2dKaVlnWTJGdVQzWmxjbVpzYjNjb1pXd3NJQ2RaSnlrN1hHNGdJQ0FnSUNCMllYSWdhWE5UWTNKdmJHeGhZbXhsV0NBOUlHaGhjMU5qY205c2JHRmliR1ZUY0dGalpTaGxiQ3dnSjFnbktTQW1KaUJqWVc1UGRtVnlabXh2ZHlobGJDd2dKMWduS1R0Y2JseHVJQ0FnSUNBZ2NtVjBkWEp1SUdselUyTnliMnhzWVdKc1pWa2dmSHdnYVhOVFkzSnZiR3hoWW14bFdEdGNiaUFnSUNCOVhHNWNiaUFnSUNBdktpcGNiaUFnSUNBZ0tpQm1hVzVrY3lCelkzSnZiR3hoWW14bElIQmhjbVZ1ZENCdlppQmhiaUJsYkdWdFpXNTBYRzRnSUNBZ0lDb2dRRzFsZEdodlpDQm1hVzVrVTJOeWIyeHNZV0pzWlZCaGNtVnVkRnh1SUNBZ0lDQXFJRUJ3WVhKaGJTQjdUbTlrWlgwZ1pXeGNiaUFnSUNBZ0tpQkFjbVYwZFhKdWN5QjdUbTlrWlgwZ1pXeGNiaUFnSUNBZ0tpOWNiaUFnSUNCbWRXNWpkR2x2YmlCbWFXNWtVMk55YjJ4c1lXSnNaVkJoY21WdWRDaGxiQ2tnZTF4dUlDQWdJQ0FnZG1GeUlHbHpRbTlrZVR0Y2JseHVJQ0FnSUNBZ1pHOGdlMXh1SUNBZ0lDQWdJQ0JsYkNBOUlHVnNMbkJoY21WdWRFNXZaR1U3WEc1Y2JpQWdJQ0FnSUNBZ2FYTkNiMlI1SUQwZ1pXd2dQVDA5SUdRdVltOWtlVHRjYmlBZ0lDQWdJSDBnZDJocGJHVWdLR2x6UW05a2VTQTlQVDBnWm1Gc2MyVWdKaVlnYVhOVFkzSnZiR3hoWW14bEtHVnNLU0E5UFQwZ1ptRnNjMlVwTzF4dVhHNGdJQ0FnSUNCcGMwSnZaSGtnUFNCdWRXeHNPMXh1WEc0Z0lDQWdJQ0J5WlhSMWNtNGdaV3c3WEc0Z0lDQWdmVnh1WEc0Z0lDQWdMeW9xWEc0Z0lDQWdJQ29nYzJWc1ppQnBiblp2YTJWa0lHWjFibU4wYVc5dUlIUm9ZWFFzSUdkcGRtVnVJR0VnWTI5dWRHVjRkQ3dnYzNSbGNITWdkR2h5YjNWbmFDQnpZM0p2Ykd4cGJtZGNiaUFnSUNBZ0tpQkFiV1YwYUc5a0lITjBaWEJjYmlBZ0lDQWdLaUJBY0dGeVlXMGdlMDlpYW1WamRIMGdZMjl1ZEdWNGRGeHVJQ0FnSUNBcUlFQnlaWFIxY201eklIdDFibVJsWm1sdVpXUjlYRzRnSUNBZ0lDb3ZYRzRnSUNBZ1puVnVZM1JwYjI0Z2MzUmxjQ2hqYjI1MFpYaDBLU0I3WEc0Z0lDQWdJQ0IyWVhJZ2RHbHRaU0E5SUc1dmR5Z3BPMXh1SUNBZ0lDQWdkbUZ5SUhaaGJIVmxPMXh1SUNBZ0lDQWdkbUZ5SUdOMWNuSmxiblJZTzF4dUlDQWdJQ0FnZG1GeUlHTjFjbkpsYm5SWk8xeHVJQ0FnSUNBZ2RtRnlJR1ZzWVhCelpXUWdQU0FvZEdsdFpTQXRJR052Ym5SbGVIUXVjM1JoY25SVWFXMWxLU0F2SUZORFVrOU1URjlVU1UxRk8xeHVYRzRnSUNBZ0lDQXZMeUJoZG05cFpDQmxiR0Z3YzJWa0lIUnBiV1Z6SUdocFoyaGxjaUIwYUdGdUlHOXVaVnh1SUNBZ0lDQWdaV3hoY0hObFpDQTlJR1ZzWVhCelpXUWdQaUF4SUQ4Z01TQTZJR1ZzWVhCelpXUTdYRzVjYmlBZ0lDQWdJQzh2SUdGd2NHeDVJR1ZoYzJsdVp5QjBieUJsYkdGd2MyVmtJSFJwYldWY2JpQWdJQ0FnSUhaaGJIVmxJRDBnWldGelpTaGxiR0Z3YzJWa0tUdGNibHh1SUNBZ0lDQWdZM1Z5Y21WdWRGZ2dQU0JqYjI1MFpYaDBMbk4wWVhKMFdDQXJJQ2hqYjI1MFpYaDBMbmdnTFNCamIyNTBaWGgwTG5OMFlYSjBXQ2tnS2lCMllXeDFaVHRjYmlBZ0lDQWdJR04xY25KbGJuUlpJRDBnWTI5dWRHVjRkQzV6ZEdGeWRGa2dLeUFvWTI5dWRHVjRkQzU1SUMwZ1kyOXVkR1Y0ZEM1emRHRnlkRmtwSUNvZ2RtRnNkV1U3WEc1Y2JpQWdJQ0FnSUdOdmJuUmxlSFF1YldWMGFHOWtMbU5oYkd3b1kyOXVkR1Y0ZEM1elkzSnZiR3hoWW14bExDQmpkWEp5Wlc1MFdDd2dZM1Z5Y21WdWRGa3BPMXh1WEc0Z0lDQWdJQ0F2THlCelkzSnZiR3dnYlc5eVpTQnBaaUIzWlNCb1lYWmxJRzV2ZENCeVpXRmphR1ZrSUc5MWNpQmtaWE4wYVc1aGRHbHZibHh1SUNBZ0lDQWdhV1lnS0dOMWNuSmxiblJZSUNFOVBTQmpiMjUwWlhoMExuZ2dmSHdnWTNWeWNtVnVkRmtnSVQwOUlHTnZiblJsZUhRdWVTa2dlMXh1SUNBZ0lDQWdJQ0IzTG5KbGNYVmxjM1JCYm1sdFlYUnBiMjVHY21GdFpTaHpkR1Z3TG1KcGJtUW9keXdnWTI5dWRHVjRkQ2twTzF4dUlDQWdJQ0FnZlZ4dUlDQWdJSDFjYmx4dUlDQWdJQzhxS2x4dUlDQWdJQ0FxSUhOamNtOXNiSE1nZDJsdVpHOTNJRzl5SUdWc1pXMWxiblFnZDJsMGFDQmhJSE50YjI5MGFDQmlaV2hoZG1sdmNseHVJQ0FnSUNBcUlFQnRaWFJvYjJRZ2MyMXZiM1JvVTJOeWIyeHNYRzRnSUNBZ0lDb2dRSEJoY21GdElIdFBZbXBsWTNSOFRtOWtaWDBnWld4Y2JpQWdJQ0FnS2lCQWNHRnlZVzBnZTA1MWJXSmxjbjBnZUZ4dUlDQWdJQ0FxSUVCd1lYSmhiU0I3VG5WdFltVnlmU0I1WEc0Z0lDQWdJQ29nUUhKbGRIVnlibk1nZTNWdVpHVm1hVzVsWkgxY2JpQWdJQ0FnS2k5Y2JpQWdJQ0JtZFc1amRHbHZiaUJ6Ylc5dmRHaFRZM0p2Ykd3b1pXd3NJSGdzSUhrcElIdGNiaUFnSUNBZ0lIWmhjaUJ6WTNKdmJHeGhZbXhsTzF4dUlDQWdJQ0FnZG1GeUlITjBZWEowV0R0Y2JpQWdJQ0FnSUhaaGNpQnpkR0Z5ZEZrN1hHNGdJQ0FnSUNCMllYSWdiV1YwYUc5a08xeHVJQ0FnSUNBZ2RtRnlJSE4wWVhKMFZHbHRaU0E5SUc1dmR5Z3BPMXh1WEc0Z0lDQWdJQ0F2THlCa1pXWnBibVVnYzJOeWIyeHNJR052Ym5SbGVIUmNiaUFnSUNBZ0lHbG1JQ2hsYkNBOVBUMGdaQzVpYjJSNUtTQjdYRzRnSUNBZ0lDQWdJSE5qY205c2JHRmliR1VnUFNCM08xeHVJQ0FnSUNBZ0lDQnpkR0Z5ZEZnZ1BTQjNMbk5qY205c2JGZ2dmSHdnZHk1d1lXZGxXRTltWm5ObGREdGNiaUFnSUNBZ0lDQWdjM1JoY25SWklEMGdkeTV6WTNKdmJHeFpJSHg4SUhjdWNHRm5aVmxQWm1aelpYUTdYRzRnSUNBZ0lDQWdJRzFsZEdodlpDQTlJRzl5YVdkcGJtRnNMbk5qY205c2JEdGNiaUFnSUNBZ0lIMGdaV3h6WlNCN1hHNGdJQ0FnSUNBZ0lITmpjbTlzYkdGaWJHVWdQU0JsYkR0Y2JpQWdJQ0FnSUNBZ2MzUmhjblJZSUQwZ1pXd3VjMk55YjJ4c1RHVm1kRHRjYmlBZ0lDQWdJQ0FnYzNSaGNuUlpJRDBnWld3dWMyTnliMnhzVkc5d08xeHVJQ0FnSUNBZ0lDQnRaWFJvYjJRZ1BTQnpZM0p2Ykd4RmJHVnRaVzUwTzF4dUlDQWdJQ0FnZlZ4dVhHNGdJQ0FnSUNBdkx5QnpZM0p2Ykd3Z2JHOXZjR2x1WnlCdmRtVnlJR0VnWm5KaGJXVmNiaUFnSUNBZ0lITjBaWEFvZTF4dUlDQWdJQ0FnSUNCelkzSnZiR3hoWW14bE9pQnpZM0p2Ykd4aFlteGxMRnh1SUNBZ0lDQWdJQ0J0WlhSb2IyUTZJRzFsZEdodlpDeGNiaUFnSUNBZ0lDQWdjM1JoY25SVWFXMWxPaUJ6ZEdGeWRGUnBiV1VzWEc0Z0lDQWdJQ0FnSUhOMFlYSjBXRG9nYzNSaGNuUllMRnh1SUNBZ0lDQWdJQ0J6ZEdGeWRGazZJSE4wWVhKMFdTeGNiaUFnSUNBZ0lDQWdlRG9nZUN4Y2JpQWdJQ0FnSUNBZ2VUb2dlVnh1SUNBZ0lDQWdmU2s3WEc0Z0lDQWdmVnh1WEc0Z0lDQWdMeThnVDFKSlIwbE9RVXdnVFVWVVNFOUVVeUJQVmtWU1VrbEVSVk5jYmlBZ0lDQXZMeUIzTG5OamNtOXNiQ0JoYm1RZ2R5NXpZM0p2Ykd4VWIxeHVJQ0FnSUhjdWMyTnliMnhzSUQwZ2R5NXpZM0p2Ykd4VWJ5QTlJR1oxYm1OMGFXOXVLQ2tnZTF4dUlDQWdJQ0FnTHk4Z1lYWnZhV1FnWVdOMGFXOXVJSGRvWlc0Z2JtOGdZWEpuZFcxbGJuUnpJR0Z5WlNCd1lYTnpaV1JjYmlBZ0lDQWdJR2xtSUNoaGNtZDFiV1Z1ZEhOYk1GMGdQVDA5SUhWdVpHVm1hVzVsWkNrZ2UxeHVJQ0FnSUNBZ0lDQnlaWFIxY200N1hHNGdJQ0FnSUNCOVhHNWNiaUFnSUNBZ0lDOHZJR0YyYjJsa0lITnRiMjkwYUNCaVpXaGhkbWx2Y2lCcFppQnViM1FnY21WeGRXbHlaV1JjYmlBZ0lDQWdJR2xtSUNoemFHOTFiR1JDWVdsc1QzVjBLR0Z5WjNWdFpXNTBjMXN3WFNrZ1BUMDlJSFJ5ZFdVcElIdGNiaUFnSUNBZ0lDQWdiM0pwWjJsdVlXd3VjMk55YjJ4c0xtTmhiR3dvWEc0Z0lDQWdJQ0FnSUNBZ2R5eGNiaUFnSUNBZ0lDQWdJQ0JoY21kMWJXVnVkSE5iTUYwdWJHVm1kQ0FoUFQwZ2RXNWtaV1pwYm1Wa1hHNGdJQ0FnSUNBZ0lDQWdJQ0EvSUdGeVozVnRaVzUwYzFzd1hTNXNaV1owWEc0Z0lDQWdJQ0FnSUNBZ0lDQTZJSFI1Y0dWdlppQmhjbWQxYldWdWRITmJNRjBnSVQwOUlDZHZZbXBsWTNRblhHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUQ4Z1lYSm5kVzFsYm5Seld6QmRYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lEb2dkeTV6WTNKdmJHeFlJSHg4SUhjdWNHRm5aVmhQWm1aelpYUXNYRzRnSUNBZ0lDQWdJQ0FnTHk4Z2RYTmxJSFJ2Y0NCd2NtOXdMQ0J6WldOdmJtUWdZWEpuZFcxbGJuUWdhV1lnY0hKbGMyVnVkQ0J2Y2lCbVlXeHNZbUZqYXlCMGJ5QnpZM0p2Ykd4WlhHNGdJQ0FnSUNBZ0lDQWdZWEpuZFcxbGJuUnpXekJkTG5SdmNDQWhQVDBnZFc1a1pXWnBibVZrWEc0Z0lDQWdJQ0FnSUNBZ0lDQS9JR0Z5WjNWdFpXNTBjMXN3WFM1MGIzQmNiaUFnSUNBZ0lDQWdJQ0FnSURvZ1lYSm5kVzFsYm5Seld6RmRJQ0U5UFNCMWJtUmxabWx1WldSY2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnUHlCaGNtZDFiV1Z1ZEhOYk1WMWNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ09pQjNMbk5qY205c2JGa2dmSHdnZHk1d1lXZGxXVTltWm5ObGRGeHVJQ0FnSUNBZ0lDQXBPMXh1WEc0Z0lDQWdJQ0FnSUhKbGRIVnlianRjYmlBZ0lDQWdJSDFjYmx4dUlDQWdJQ0FnTHk4Z1RFVlVJRlJJUlNCVFRVOVBWRWhPUlZOVElFSkZSMGxPSVZ4dUlDQWdJQ0FnYzIxdmIzUm9VMk55YjJ4c0xtTmhiR3dvWEc0Z0lDQWdJQ0FnSUhjc1hHNGdJQ0FnSUNBZ0lHUXVZbTlrZVN4Y2JpQWdJQ0FnSUNBZ1lYSm5kVzFsYm5Seld6QmRMbXhsWm5RZ0lUMDlJSFZ1WkdWbWFXNWxaRnh1SUNBZ0lDQWdJQ0FnSUQ4Z2ZuNWhjbWQxYldWdWRITmJNRjB1YkdWbWRGeHVJQ0FnSUNBZ0lDQWdJRG9nZHk1elkzSnZiR3hZSUh4OElIY3VjR0ZuWlZoUFptWnpaWFFzWEc0Z0lDQWdJQ0FnSUdGeVozVnRaVzUwYzFzd1hTNTBiM0FnSVQwOUlIVnVaR1ZtYVc1bFpGeHVJQ0FnSUNBZ0lDQWdJRDhnZm41aGNtZDFiV1Z1ZEhOYk1GMHVkRzl3WEc0Z0lDQWdJQ0FnSUNBZ09pQjNMbk5qY205c2JGa2dmSHdnZHk1d1lXZGxXVTltWm5ObGRGeHVJQ0FnSUNBZ0tUdGNiaUFnSUNCOU8xeHVYRzRnSUNBZ0x5OGdkeTV6WTNKdmJHeENlVnh1SUNBZ0lIY3VjMk55YjJ4c1Fua2dQU0JtZFc1amRHbHZiaWdwSUh0Y2JpQWdJQ0FnSUM4dklHRjJiMmxrSUdGamRHbHZiaUIzYUdWdUlHNXZJR0Z5WjNWdFpXNTBjeUJoY21VZ2NHRnpjMlZrWEc0Z0lDQWdJQ0JwWmlBb1lYSm5kVzFsYm5Seld6QmRJRDA5UFNCMWJtUmxabWx1WldRcElIdGNiaUFnSUNBZ0lDQWdjbVYwZFhKdU8xeHVJQ0FnSUNBZ2ZWeHVYRzRnSUNBZ0lDQXZMeUJoZG05cFpDQnpiVzl2ZEdnZ1ltVm9ZWFpwYjNJZ2FXWWdibTkwSUhKbGNYVnBjbVZrWEc0Z0lDQWdJQ0JwWmlBb2MyaHZkV3hrUW1GcGJFOTFkQ2hoY21kMWJXVnVkSE5iTUYwcEtTQjdYRzRnSUNBZ0lDQWdJRzl5YVdkcGJtRnNMbk5qY205c2JFSjVMbU5oYkd3b1hHNGdJQ0FnSUNBZ0lDQWdkeXhjYmlBZ0lDQWdJQ0FnSUNCaGNtZDFiV1Z1ZEhOYk1GMHViR1ZtZENBaFBUMGdkVzVrWldacGJtVmtYRzRnSUNBZ0lDQWdJQ0FnSUNBL0lHRnlaM1Z0Wlc1MGMxc3dYUzVzWldaMFhHNGdJQ0FnSUNBZ0lDQWdJQ0E2SUhSNWNHVnZaaUJoY21kMWJXVnVkSE5iTUYwZ0lUMDlJQ2R2WW1wbFkzUW5JRDhnWVhKbmRXMWxiblJ6V3pCZElEb2dNQ3hjYmlBZ0lDQWdJQ0FnSUNCaGNtZDFiV1Z1ZEhOYk1GMHVkRzl3SUNFOVBTQjFibVJsWm1sdVpXUmNiaUFnSUNBZ0lDQWdJQ0FnSUQ4Z1lYSm5kVzFsYm5Seld6QmRMblJ2Y0Z4dUlDQWdJQ0FnSUNBZ0lDQWdPaUJoY21kMWJXVnVkSE5iTVYwZ0lUMDlJSFZ1WkdWbWFXNWxaQ0EvSUdGeVozVnRaVzUwYzFzeFhTQTZJREJjYmlBZ0lDQWdJQ0FnS1R0Y2JseHVJQ0FnSUNBZ0lDQnlaWFIxY200N1hHNGdJQ0FnSUNCOVhHNWNiaUFnSUNBZ0lDOHZJRXhGVkNCVVNFVWdVMDFQVDFSSVRrVlRVeUJDUlVkSlRpRmNiaUFnSUNBZ0lITnRiMjkwYUZOamNtOXNiQzVqWVd4c0tGeHVJQ0FnSUNBZ0lDQjNMRnh1SUNBZ0lDQWdJQ0JrTG1KdlpIa3NYRzRnSUNBZ0lDQWdJSDUrWVhKbmRXMWxiblJ6V3pCZExteGxablFnS3lBb2R5NXpZM0p2Ykd4WUlIeDhJSGN1Y0dGblpWaFBabVp6WlhRcExGeHVJQ0FnSUNBZ0lDQitmbUZ5WjNWdFpXNTBjMXN3WFM1MGIzQWdLeUFvZHk1elkzSnZiR3haSUh4OElIY3VjR0ZuWlZsUFptWnpaWFFwWEc0Z0lDQWdJQ0FwTzF4dUlDQWdJSDA3WEc1Y2JpQWdJQ0F2THlCRmJHVnRaVzUwTG5CeWIzUnZkSGx3WlM1elkzSnZiR3dnWVc1a0lFVnNaVzFsYm5RdWNISnZkRzkwZVhCbExuTmpjbTlzYkZSdlhHNGdJQ0FnUld4bGJXVnVkQzV3Y205MGIzUjVjR1V1YzJOeWIyeHNJRDBnUld4bGJXVnVkQzV3Y205MGIzUjVjR1V1YzJOeWIyeHNWRzhnUFNCbWRXNWpkR2x2YmlncElIdGNiaUFnSUNBZ0lDOHZJR0YyYjJsa0lHRmpkR2x2YmlCM2FHVnVJRzV2SUdGeVozVnRaVzUwY3lCaGNtVWdjR0Z6YzJWa1hHNGdJQ0FnSUNCcFppQW9ZWEpuZFcxbGJuUnpXekJkSUQwOVBTQjFibVJsWm1sdVpXUXBJSHRjYmlBZ0lDQWdJQ0FnY21WMGRYSnVPMXh1SUNBZ0lDQWdmVnh1WEc0Z0lDQWdJQ0F2THlCaGRtOXBaQ0J6Ylc5dmRHZ2dZbVZvWVhacGIzSWdhV1lnYm05MElISmxjWFZwY21Wa1hHNGdJQ0FnSUNCcFppQW9jMmh2ZFd4a1FtRnBiRTkxZENoaGNtZDFiV1Z1ZEhOYk1GMHBJRDA5UFNCMGNuVmxLU0I3WEc0Z0lDQWdJQ0FnSUM4dklHbG1JRzl1WlNCdWRXMWlaWElnYVhNZ2NHRnpjMlZrTENCMGFISnZkeUJsY25KdmNpQjBieUJ0WVhSamFDQkdhWEpsWm05NElHbHRjR3hsYldWdWRHRjBhVzl1WEc0Z0lDQWdJQ0FnSUdsbUlDaDBlWEJsYjJZZ1lYSm5kVzFsYm5Seld6QmRJRDA5UFNBbmJuVnRZbVZ5SnlBbUppQmhjbWQxYldWdWRITmJNVjBnUFQwOUlIVnVaR1ZtYVc1bFpDa2dlMXh1SUNBZ0lDQWdJQ0FnSUhSb2NtOTNJRzVsZHlCVGVXNTBZWGhGY25KdmNpZ25WbUZzZFdVZ1kyOTFiR1FnYm05MElHSmxJR052Ym5abGNuUmxaQ2NwTzF4dUlDQWdJQ0FnSUNCOVhHNWNiaUFnSUNBZ0lDQWdiM0pwWjJsdVlXd3VaV3hsYldWdWRGTmpjbTlzYkM1allXeHNLRnh1SUNBZ0lDQWdJQ0FnSUhSb2FYTXNYRzRnSUNBZ0lDQWdJQ0FnTHk4Z2RYTmxJR3hsWm5RZ2NISnZjQ3dnWm1seWMzUWdiblZ0WW1WeUlHRnlaM1Z0Wlc1MElHOXlJR1poYkd4aVlXTnJJSFJ2SUhOamNtOXNiRXhsWm5SY2JpQWdJQ0FnSUNBZ0lDQmhjbWQxYldWdWRITmJNRjB1YkdWbWRDQWhQVDBnZFc1a1pXWnBibVZrWEc0Z0lDQWdJQ0FnSUNBZ0lDQS9JSDUrWVhKbmRXMWxiblJ6V3pCZExteGxablJjYmlBZ0lDQWdJQ0FnSUNBZ0lEb2dkSGx3Wlc5bUlHRnlaM1Z0Wlc1MGMxc3dYU0FoUFQwZ0oyOWlhbVZqZENjZ1B5QitmbUZ5WjNWdFpXNTBjMXN3WFNBNklIUm9hWE11YzJOeWIyeHNUR1ZtZEN4Y2JpQWdJQ0FnSUNBZ0lDQXZMeUIxYzJVZ2RHOXdJSEJ5YjNBc0lITmxZMjl1WkNCaGNtZDFiV1Z1ZENCdmNpQm1ZV3hzWW1GamF5QjBieUJ6WTNKdmJHeFViM0JjYmlBZ0lDQWdJQ0FnSUNCaGNtZDFiV1Z1ZEhOYk1GMHVkRzl3SUNFOVBTQjFibVJsWm1sdVpXUmNiaUFnSUNBZ0lDQWdJQ0FnSUQ4Z2ZuNWhjbWQxYldWdWRITmJNRjB1ZEc5d1hHNGdJQ0FnSUNBZ0lDQWdJQ0E2SUdGeVozVnRaVzUwYzFzeFhTQWhQVDBnZFc1a1pXWnBibVZrSUQ4Z2ZuNWhjbWQxYldWdWRITmJNVjBnT2lCMGFHbHpMbk5qY205c2JGUnZjRnh1SUNBZ0lDQWdJQ0FwTzF4dVhHNGdJQ0FnSUNBZ0lISmxkSFZ5Ymp0Y2JpQWdJQ0FnSUgxY2JseHVJQ0FnSUNBZ2RtRnlJR3hsWm5RZ1BTQmhjbWQxYldWdWRITmJNRjB1YkdWbWREdGNiaUFnSUNBZ0lIWmhjaUIwYjNBZ1BTQmhjbWQxYldWdWRITmJNRjB1ZEc5d08xeHVYRzRnSUNBZ0lDQXZMeUJNUlZRZ1ZFaEZJRk5OVDA5VVNFNUZVMU1nUWtWSFNVNGhYRzRnSUNBZ0lDQnpiVzl2ZEdoVFkzSnZiR3d1WTJGc2JDaGNiaUFnSUNBZ0lDQWdkR2hwY3l4Y2JpQWdJQ0FnSUNBZ2RHaHBjeXhjYmlBZ0lDQWdJQ0FnZEhsd1pXOW1JR3hsWm5RZ1BUMDlJQ2QxYm1SbFptbHVaV1FuSUQ4Z2RHaHBjeTV6WTNKdmJHeE1aV1owSURvZ2ZuNXNaV1owTEZ4dUlDQWdJQ0FnSUNCMGVYQmxiMllnZEc5d0lEMDlQU0FuZFc1a1pXWnBibVZrSnlBL0lIUm9hWE11YzJOeWIyeHNWRzl3SURvZ2ZuNTBiM0JjYmlBZ0lDQWdJQ2s3WEc0Z0lDQWdmVHRjYmx4dUlDQWdJQzh2SUVWc1pXMWxiblF1Y0hKdmRHOTBlWEJsTG5OamNtOXNiRUo1WEc0Z0lDQWdSV3hsYldWdWRDNXdjbTkwYjNSNWNHVXVjMk55YjJ4c1Fua2dQU0JtZFc1amRHbHZiaWdwSUh0Y2JpQWdJQ0FnSUM4dklHRjJiMmxrSUdGamRHbHZiaUIzYUdWdUlHNXZJR0Z5WjNWdFpXNTBjeUJoY21VZ2NHRnpjMlZrWEc0Z0lDQWdJQ0JwWmlBb1lYSm5kVzFsYm5Seld6QmRJRDA5UFNCMWJtUmxabWx1WldRcElIdGNiaUFnSUNBZ0lDQWdjbVYwZFhKdU8xeHVJQ0FnSUNBZ2ZWeHVYRzRnSUNBZ0lDQXZMeUJoZG05cFpDQnpiVzl2ZEdnZ1ltVm9ZWFpwYjNJZ2FXWWdibTkwSUhKbGNYVnBjbVZrWEc0Z0lDQWdJQ0JwWmlBb2MyaHZkV3hrUW1GcGJFOTFkQ2hoY21kMWJXVnVkSE5iTUYwcElEMDlQU0IwY25WbEtTQjdYRzRnSUNBZ0lDQWdJRzl5YVdkcGJtRnNMbVZzWlcxbGJuUlRZM0p2Ykd3dVkyRnNiQ2hjYmlBZ0lDQWdJQ0FnSUNCMGFHbHpMRnh1SUNBZ0lDQWdJQ0FnSUdGeVozVnRaVzUwYzFzd1hTNXNaV1owSUNFOVBTQjFibVJsWm1sdVpXUmNiaUFnSUNBZ0lDQWdJQ0FnSUQ4Z2ZuNWhjbWQxYldWdWRITmJNRjB1YkdWbWRDQXJJSFJvYVhNdWMyTnliMnhzVEdWbWRGeHVJQ0FnSUNBZ0lDQWdJQ0FnT2lCK2ZtRnlaM1Z0Wlc1MGMxc3dYU0FySUhSb2FYTXVjMk55YjJ4c1RHVm1kQ3hjYmlBZ0lDQWdJQ0FnSUNCaGNtZDFiV1Z1ZEhOYk1GMHVkRzl3SUNFOVBTQjFibVJsWm1sdVpXUmNiaUFnSUNBZ0lDQWdJQ0FnSUQ4Z2ZuNWhjbWQxYldWdWRITmJNRjB1ZEc5d0lDc2dkR2hwY3k1elkzSnZiR3hVYjNCY2JpQWdJQ0FnSUNBZ0lDQWdJRG9nZm41aGNtZDFiV1Z1ZEhOYk1WMGdLeUIwYUdsekxuTmpjbTlzYkZSdmNGeHVJQ0FnSUNBZ0lDQXBPMXh1WEc0Z0lDQWdJQ0FnSUhKbGRIVnlianRjYmlBZ0lDQWdJSDFjYmx4dUlDQWdJQ0FnZEdocGN5NXpZM0p2Ykd3b2UxeHVJQ0FnSUNBZ0lDQnNaV1owT2lCK2ZtRnlaM1Z0Wlc1MGMxc3dYUzVzWldaMElDc2dkR2hwY3k1elkzSnZiR3hNWldaMExGeHVJQ0FnSUNBZ0lDQjBiM0E2SUg1K1lYSm5kVzFsYm5Seld6QmRMblJ2Y0NBcklIUm9hWE11YzJOeWIyeHNWRzl3TEZ4dUlDQWdJQ0FnSUNCaVpXaGhkbWx2Y2pvZ1lYSm5kVzFsYm5Seld6QmRMbUpsYUdGMmFXOXlYRzRnSUNBZ0lDQjlLVHRjYmlBZ0lDQjlPMXh1WEc0Z0lDQWdMeThnUld4bGJXVnVkQzV3Y205MGIzUjVjR1V1YzJOeWIyeHNTVzUwYjFacFpYZGNiaUFnSUNCRmJHVnRaVzUwTG5CeWIzUnZkSGx3WlM1elkzSnZiR3hKYm5SdlZtbGxkeUE5SUdaMWJtTjBhVzl1S0NrZ2UxeHVJQ0FnSUNBZ0x5OGdZWFp2YVdRZ2MyMXZiM1JvSUdKbGFHRjJhVzl5SUdsbUlHNXZkQ0J5WlhGMWFYSmxaRnh1SUNBZ0lDQWdhV1lnS0hOb2IzVnNaRUpoYVd4UGRYUW9ZWEpuZFcxbGJuUnpXekJkS1NBOVBUMGdkSEoxWlNrZ2UxeHVJQ0FnSUNBZ0lDQnZjbWxuYVc1aGJDNXpZM0p2Ykd4SmJuUnZWbWxsZHk1allXeHNLRnh1SUNBZ0lDQWdJQ0FnSUhSb2FYTXNYRzRnSUNBZ0lDQWdJQ0FnWVhKbmRXMWxiblJ6V3pCZElEMDlQU0IxYm1SbFptbHVaV1FnUHlCMGNuVmxJRG9nWVhKbmRXMWxiblJ6V3pCZFhHNGdJQ0FnSUNBZ0lDazdYRzVjYmlBZ0lDQWdJQ0FnY21WMGRYSnVPMXh1SUNBZ0lDQWdmVnh1WEc0Z0lDQWdJQ0F2THlCTVJWUWdWRWhGSUZOTlQwOVVTRTVGVTFNZ1FrVkhTVTRoWEc0Z0lDQWdJQ0IyWVhJZ2MyTnliMnhzWVdKc1pWQmhjbVZ1ZENBOUlHWnBibVJUWTNKdmJHeGhZbXhsVUdGeVpXNTBLSFJvYVhNcE8xeHVJQ0FnSUNBZ2RtRnlJSEJoY21WdWRGSmxZM1J6SUQwZ2MyTnliMnhzWVdKc1pWQmhjbVZ1ZEM1blpYUkNiM1Z1WkdsdVowTnNhV1Z1ZEZKbFkzUW9LVHRjYmlBZ0lDQWdJSFpoY2lCamJHbGxiblJTWldOMGN5QTlJSFJvYVhNdVoyVjBRbTkxYm1ScGJtZERiR2xsYm5SU1pXTjBLQ2s3WEc1Y2JpQWdJQ0FnSUdsbUlDaHpZM0p2Ykd4aFlteGxVR0Z5Wlc1MElDRTlQU0JrTG1KdlpIa3BJSHRjYmlBZ0lDQWdJQ0FnTHk4Z2NtVjJaV0ZzSUdWc1pXMWxiblFnYVc1emFXUmxJSEJoY21WdWRGeHVJQ0FnSUNBZ0lDQnpiVzl2ZEdoVFkzSnZiR3d1WTJGc2JDaGNiaUFnSUNBZ0lDQWdJQ0IwYUdsekxGeHVJQ0FnSUNBZ0lDQWdJSE5qY205c2JHRmliR1ZRWVhKbGJuUXNYRzRnSUNBZ0lDQWdJQ0FnYzJOeWIyeHNZV0pzWlZCaGNtVnVkQzV6WTNKdmJHeE1aV1owSUNzZ1kyeHBaVzUwVW1WamRITXViR1ZtZENBdElIQmhjbVZ1ZEZKbFkzUnpMbXhsWm5Rc1hHNGdJQ0FnSUNBZ0lDQWdjMk55YjJ4c1lXSnNaVkJoY21WdWRDNXpZM0p2Ykd4VWIzQWdLeUJqYkdsbGJuUlNaV04wY3k1MGIzQWdMU0J3WVhKbGJuUlNaV04wY3k1MGIzQmNiaUFnSUNBZ0lDQWdLVHRjYmx4dUlDQWdJQ0FnSUNBdkx5QnlaWFpsWVd3Z2NHRnlaVzUwSUdsdUlIWnBaWGR3YjNKMElIVnViR1Z6Y3lCcGN5Qm1hWGhsWkZ4dUlDQWdJQ0FnSUNCcFppQW9keTVuWlhSRGIyMXdkWFJsWkZOMGVXeGxLSE5qY205c2JHRmliR1ZRWVhKbGJuUXBMbkJ2YzJsMGFXOXVJQ0U5UFNBblptbDRaV1FuS1NCN1hHNGdJQ0FnSUNBZ0lDQWdkeTV6WTNKdmJHeENlU2g3WEc0Z0lDQWdJQ0FnSUNBZ0lDQnNaV1owT2lCd1lYSmxiblJTWldOMGN5NXNaV1owTEZ4dUlDQWdJQ0FnSUNBZ0lDQWdkRzl3T2lCd1lYSmxiblJTWldOMGN5NTBiM0FzWEc0Z0lDQWdJQ0FnSUNBZ0lDQmlaV2hoZG1sdmNqb2dKM050YjI5MGFDZGNiaUFnSUNBZ0lDQWdJQ0I5S1R0Y2JpQWdJQ0FnSUNBZ2ZWeHVJQ0FnSUNBZ2ZTQmxiSE5sSUh0Y2JpQWdJQ0FnSUNBZ0x5OGdjbVYyWldGc0lHVnNaVzFsYm5RZ2FXNGdkbWxsZDNCdmNuUmNiaUFnSUNBZ0lDQWdkeTV6WTNKdmJHeENlU2g3WEc0Z0lDQWdJQ0FnSUNBZ2JHVm1kRG9nWTJ4cFpXNTBVbVZqZEhNdWJHVm1kQ3hjYmlBZ0lDQWdJQ0FnSUNCMGIzQTZJR05zYVdWdWRGSmxZM1J6TG5SdmNDeGNiaUFnSUNBZ0lDQWdJQ0JpWldoaGRtbHZjam9nSjNOdGIyOTBhQ2RjYmlBZ0lDQWdJQ0FnZlNrN1hHNGdJQ0FnSUNCOVhHNGdJQ0FnZlR0Y2JpQWdmVnh1WEc0Z0lHbG1JQ2gwZVhCbGIyWWdaWGh3YjNKMGN5QTlQVDBnSjI5aWFtVmpkQ2NnSmlZZ2RIbHdaVzltSUcxdlpIVnNaU0FoUFQwZ0ozVnVaR1ZtYVc1bFpDY3BJSHRjYmlBZ0lDQXZMeUJqYjIxdGIyNXFjMXh1SUNBZ0lHMXZaSFZzWlM1bGVIQnZjblJ6SUQwZ2V5QndiMng1Wm1sc2JEb2djRzlzZVdacGJHd2dmVHRjYmlBZ2ZTQmxiSE5sSUh0Y2JpQWdJQ0F2THlCbmJHOWlZV3hjYmlBZ0lDQndiMng1Wm1sc2JDZ3BPMXh1SUNCOVhHNWNibjBvS1NrN1hHNGlMQ0pwYlhCdmNuUWdjMjF2YjNSb2MyTnliMnhzSUdaeWIyMGdKM050YjI5MGFITmpjbTlzYkMxd2IyeDVabWxzYkNjN1hHNWNibWx0Y0c5eWRDQjdJR0Z5ZEdsamJHVlVaVzF3YkdGMFpTd2dibUYyVEdjZ2ZTQm1jbTl0SUNjdUwzUmxiWEJzWVhSbGN5YzdYRzVwYlhCdmNuUWdleUJrWldKdmRXNWpaU0I5SUdaeWIyMGdKeTR2ZFhScGJITW5PMXh1WEc1Y2JtTnZibk4wSUVSQ0lEMGdKMmgwZEhCek9pOHZibVY0ZFhNdFkyRjBZV3h2Wnk1bWFYSmxZbUZ6WldsdkxtTnZiUzl3YjNOMGN5NXFjMjl1UDJGMWRHZzlOMmMzY0hsTFMzbHJUak5PTldWM2NrbHRhRTloVXpaMmQzSkdjMk0xWmt0cmNtczRaV3A2WmljN1hHNWpiMjV6ZENCaGJIQm9ZV0psZENBOUlGc25ZU2NzSUNkaUp5d2dKMk1uTENBblpDY3NJQ2RsSnl3Z0oyWW5MQ0FuWnljc0lDZG9KeXdnSjJrbkxDQW5haWNzSUNkckp5d2dKMnduTENBbmJTY3NJQ2R1Snl3Z0oyOG5MQ0FuY0Njc0lDZHlKeXdnSjNNbkxDQW5kQ2NzSUNkMUp5d2dKM1luTENBbmR5Y3NJQ2Q1Snl3Z0ozb25YVHRjYmx4dVkyOXVjM1FnSkd4dllXUnBibWNnUFNCQmNuSmhlUzVtY205dEtHUnZZM1Z0Wlc1MExuRjFaWEo1VTJWc1pXTjBiM0pCYkd3b0p5NXNiMkZrYVc1bkp5a3BPMXh1WTI5dWMzUWdKRzVoZGlBOUlHUnZZM1Z0Wlc1MExtZGxkRVZzWlcxbGJuUkNlVWxrS0NkcWN5MXVZWFluS1R0Y2JtTnZibk4wSUNSd1lYSmhiR3hoZUNBOUlHUnZZM1Z0Wlc1MExuRjFaWEo1VTJWc1pXTjBiM0lvSnk1d1lYSmhiR3hoZUNjcE8xeHVZMjl1YzNRZ0pHTnZiblJsYm5RZ1BTQmtiMk4xYldWdWRDNXhkV1Z5ZVZObGJHVmpkRzl5S0NjdVkyOXVkR1Z1ZENjcE8xeHVZMjl1YzNRZ0pIUnBkR3hsSUQwZ1pHOWpkVzFsYm5RdVoyVjBSV3hsYldWdWRFSjVTV1FvSjJwekxYUnBkR3hsSnlrN1hHNWpiMjV6ZENBa1lYSnliM2NnUFNCa2IyTjFiV1Z1ZEM1eGRXVnllVk5sYkdWamRHOXlLQ2N1WVhKeWIzY25LVHRjYm1OdmJuTjBJQ1J0YjJSaGJDQTlJR1J2WTNWdFpXNTBMbkYxWlhKNVUyVnNaV04wYjNJb0p5NXRiMlJoYkNjcE8xeHVZMjl1YzNRZ0pHeHBaMmgwWW05NElEMGdaRzlqZFcxbGJuUXVjWFZsY25sVFpXeGxZM1J2Y2lnbkxteHBaMmgwWW05NEp5azdYRzVqYjI1emRDQWtkbWxsZHlBOUlHUnZZM1Z0Wlc1MExuRjFaWEo1VTJWc1pXTjBiM0lvSnk1c2FXZG9kR0p2ZUMxMmFXVjNKeWs3WEc1Y2JteGxkQ0J6YjNKMFMyVjVJRDBnTURzZ0x5OGdNQ0E5SUdGeWRHbHpkQ3dnTVNBOUlIUnBkR3hsWEc1c1pYUWdaVzUwY21sbGN5QTlJSHNnWW5sQmRYUm9iM0k2SUZ0ZExDQmllVlJwZEd4bE9pQmJYU0I5TzF4dWJHVjBJR04xY25KbGJuUk1aWFIwWlhJZ1BTQW5RU2M3WEc1Y2JteGxkQ0JzYVdkb2RHSnZlQ0E5SUdaaGJITmxPMXh1YkdWMElIZ3lJRDBnWm1Gc2MyVTdYRzVqYjI1emRDQmhkSFJoWTJoSmJXRm5aVXhwYzNSbGJtVnljeUE5SUNncElEMCtJSHRjYmx4MFkyOXVjM1FnSkdsdFlXZGxjeUE5SUVGeWNtRjVMbVp5YjIwb1pHOWpkVzFsYm5RdWNYVmxjbmxUWld4bFkzUnZja0ZzYkNnbkxtRnlkR2xqYkdVdGFXMWhaMlVuS1NrN1hHNWNibHgwSkdsdFlXZGxjeTVtYjNKRllXTm9LR2x0WnlBOVBpQjdYRzVjZEZ4MGFXMW5MbUZrWkVWMlpXNTBUR2x6ZEdWdVpYSW9KMk5zYVdOckp5d2dLR1YyZENrZ1BUNGdlMXh1WEhSY2RGeDBhV1lnS0NGc2FXZG9kR0p2ZUNrZ2UxeHVYSFJjZEZ4MFhIUnNaWFFnYzNKaklEMGdhVzFuTG5OeVl6dGNibHgwWEhSY2RGeDBYRzVjZEZ4MFhIUmNkQ1JzYVdkb2RHSnZlQzVqYkdGemMweHBjM1F1WVdSa0tDZHphRzkzTFdsdFp5Y3BPMXh1WEhSY2RGeDBYSFFrZG1sbGR5NXpaWFJCZEhSeWFXSjFkR1VvSjNOMGVXeGxKeXdnWUdKaFkydG5jbTkxYm1RdGFXMWhaMlU2SUhWeWJDZ2tlM055WTMwcFlDazdYRzVjZEZ4MFhIUmNkR3hwWjJoMFltOTRJRDBnZEhKMVpUdGNibHgwWEhSY2RIMWNibHgwWEhSOUtUdGNibHgwZlNrN1hHNWNibHgwSkhacFpYY3VZV1JrUlhabGJuUk1hWE4wWlc1bGNpZ25ZMnhwWTJzbkxDQW9LU0E5UGlCN1hHNWNkRngwYVdZZ0tHeHBaMmgwWW05NEtTQjdYRzVjZEZ4MFhIUWtiR2xuYUhSaWIzZ3VZMnhoYzNOTWFYTjBMbkpsYlc5MlpTZ25jMmh2ZHkxcGJXY25LVHRjYmx4MFhIUmNkR3hwWjJoMFltOTRJRDBnWm1Gc2MyVTdYRzVjZEZ4MGZWeHVYSFI5S1R0Y2JuMDdYRzVjYm14bGRDQnRiMlJoYkNBOUlHWmhiSE5sTzF4dVkyOXVjM1FnWVhSMFlXTm9UVzlrWVd4TWFYTjBaVzVsY25NZ1BTQW9LU0E5UGlCN1hHNWNkR052Ym5OMElDUm1hVzVrSUQwZ1pHOWpkVzFsYm5RdVoyVjBSV3hsYldWdWRFSjVTV1FvSjJwekxXWnBibVFuS1R0Y2JseDBYRzVjZENSbWFXNWtMbUZrWkVWMlpXNTBUR2x6ZEdWdVpYSW9KMk5zYVdOckp5d2dLQ2tnUFQ0Z2UxeHVYSFJjZENSdGIyUmhiQzVqYkdGemMweHBjM1F1WVdSa0tDZHphRzkzSnlrN1hHNWNkRngwYlc5a1lXd2dQU0IwY25WbE8xeHVYSFI5S1R0Y2JseHVYSFFrYlc5a1lXd3VZV1JrUlhabGJuUk1hWE4wWlc1bGNpZ25ZMnhwWTJzbkxDQW9LU0E5UGlCN1hHNWNkRngwSkcxdlpHRnNMbU5zWVhOelRHbHpkQzV5WlcxdmRtVW9KM05vYjNjbktUdGNibHgwWEhSdGIyUmhiQ0E5SUdaaGJITmxPMXh1WEhSOUtUdGNibHh1WEhSM2FXNWtiM2N1WVdSa1JYWmxiblJNYVhOMFpXNWxjaWduYTJWNVpHOTNiaWNzSUNncElEMCtJSHRjYmx4MFhIUnBaaUFvYlc5a1lXd3BJSHRjYmx4MFhIUmNkSE5sZEZScGJXVnZkWFFvS0NrZ1BUNGdlMXh1WEhSY2RGeDBYSFFrYlc5a1lXd3VZMnhoYzNOTWFYTjBMbkpsYlc5MlpTZ25jMmh2ZHljcE8xeHVYSFJjZEZ4MFhIUnRiMlJoYkNBOUlHWmhiSE5sTzF4dVhIUmNkRngwZlN3Z05qQXdLVHRjYmx4MFhIUjlPMXh1WEhSOUtUdGNibjFjYmx4dVkyOXVjM1FnYzJOeWIyeHNWRzlVYjNBZ1BTQW9LU0E5UGlCN1hHNWNkR3hsZENCMGFHbHVaeUE5SUdSdlkzVnRaVzUwTG1kbGRFVnNaVzFsYm5SQ2VVbGtLQ2RoYm1Ob2IzSXRkR0Z5WjJWMEp5azdYRzVjZEhSb2FXNW5Mbk5qY205c2JFbHVkRzlXYVdWM0tIdGlaV2hoZG1sdmNqb2dYQ0p6Ylc5dmRHaGNJaXdnWW14dlkyczZJRndpYzNSaGNuUmNJbjBwTzF4dWZWeHVYRzVzWlhRZ2NISmxkanRjYm14bGRDQmpkWEp5Wlc1MElEMGdNRHRjYm14bGRDQnBjMU5vYjNkcGJtY2dQU0JtWVd4elpUdGNibU52Ym5OMElHRjBkR0ZqYUVGeWNtOTNUR2x6ZEdWdVpYSnpJRDBnS0NrZ1BUNGdlMXh1WEhRa1lYSnliM2N1WVdSa1JYWmxiblJNYVhOMFpXNWxjaWduWTJ4cFkyc25MQ0FvS1NBOVBpQjdYRzVjZEZ4MGMyTnliMnhzVkc5VWIzQW9LVHRjYmx4MGZTazdYRzVjYmx4MEpIQmhjbUZzYkdGNExtRmtaRVYyWlc1MFRHbHpkR1Z1WlhJb0ozTmpjbTlzYkNjc0lDZ3BJRDArSUh0Y2JseHVYSFJjZEd4bGRDQjVJRDBnSkhScGRHeGxMbWRsZEVKdmRXNWthVzVuUTJ4cFpXNTBVbVZqZENncExuazdYRzVjZEZ4MGFXWWdLR04xY25KbGJuUWdJVDA5SUhrcElIdGNibHgwWEhSY2RIQnlaWFlnUFNCamRYSnlaVzUwTzF4dVhIUmNkRngwWTNWeWNtVnVkQ0E5SUhrN1hHNWNkRngwZlZ4dVhHNWNkRngwYVdZZ0tIa2dQRDBnTFRVd0lDWW1JQ0ZwYzFOb2IzZHBibWNwSUh0Y2JseDBYSFJjZENSaGNuSnZkeTVqYkdGemMweHBjM1F1WVdSa0tDZHphRzkzSnlrN1hHNWNkRngwWEhScGMxTm9iM2RwYm1jZ1BTQjBjblZsTzF4dVhIUmNkSDBnWld4elpTQnBaaUFvZVNBK0lDMDFNQ0FtSmlCcGMxTm9iM2RwYm1jcElIdGNibHgwWEhSY2RDUmhjbkp2ZHk1amJHRnpjMHhwYzNRdWNtVnRiM1psS0NkemFHOTNKeWs3WEc1Y2RGeDBYSFJwYzFOb2IzZHBibWNnUFNCbVlXeHpaVHRjYmx4MFhIUjlYRzVjZEgwcE8xeHVmVHRjYmx4dVkyOXVjM1FnWVdSa1UyOXlkRUoxZEhSdmJreHBjM1JsYm1WeWN5QTlJQ2dwSUQwK0lIdGNibHgwYkdWMElDUmllVUZ5ZEdsemRDQTlJR1J2WTNWdFpXNTBMbWRsZEVWc1pXMWxiblJDZVVsa0tDZHFjeTFpZVMxaGNuUnBjM1FuS1R0Y2JseDBiR1YwSUNSaWVWUnBkR3hsSUQwZ1pHOWpkVzFsYm5RdVoyVjBSV3hsYldWdWRFSjVTV1FvSjJwekxXSjVMWFJwZEd4bEp5azdYRzVjZENSaWVVRnlkR2x6ZEM1aFpHUkZkbVZ1ZEV4cGMzUmxibVZ5S0NkamJHbGpheWNzSUNncElEMCtJSHRjYmx4MFhIUnBaaUFvYzI5eWRFdGxlU2tnZTF4dVhIUmNkRngwYzJOeWIyeHNWRzlVYjNBb0tUdGNibHgwWEhSY2RITnZjblJMWlhrZ1BTQXdPMXh1WEhSY2RGeDBKR0o1UVhKMGFYTjBMbU5zWVhOelRHbHpkQzVoWkdRb0oyRmpkR2wyWlNjcE8xeHVYSFJjZEZ4MEpHSjVWR2wwYkdVdVkyeGhjM05NYVhOMExuSmxiVzkyWlNnbllXTjBhWFpsSnlrN1hHNWNibHgwWEhSY2RISmxibVJsY2tWdWRISnBaWE1vS1R0Y2JseDBYSFI5WEc1Y2RIMHBPMXh1WEc1Y2RDUmllVlJwZEd4bExtRmtaRVYyWlc1MFRHbHpkR1Z1WlhJb0oyTnNhV05ySnl3Z0tDa2dQVDRnZTF4dVhIUmNkR2xtSUNnaGMyOXlkRXRsZVNrZ2UxeHVYSFJjZEZ4MGMyTnliMnhzVkc5VWIzQW9LVHRjYmx4MFhIUmNkSE52Y25STFpYa2dQU0F4TzF4dVhIUmNkRngwSkdKNVZHbDBiR1V1WTJ4aGMzTk1hWE4wTG1Ga1pDZ25ZV04wYVhabEp5azdYRzVjZEZ4MFhIUWtZbmxCY25ScGMzUXVZMnhoYzNOTWFYTjBMbkpsYlc5MlpTZ25ZV04wYVhabEp5azdYRzVjYmx4MFhIUmNkSEpsYm1SbGNrVnVkSEpwWlhNb0tUdGNibHgwWEhSOVhHNWNkSDBwTzF4dWZUdGNibHh1WTI5dWMzUWdZMnhsWVhKQmJtTm9iM0p6SUQwZ0tIQnlaWFpUWld4bFkzUnZjaWtnUFQ0Z2UxeHVYSFJzWlhRZ0pHVnVkSEpwWlhNZ1BTQkJjbkpoZVM1bWNtOXRLR1J2WTNWdFpXNTBMbkYxWlhKNVUyVnNaV04wYjNKQmJHd29jSEpsZGxObGJHVmpkRzl5S1NrN1hHNWNkQ1JsYm5SeWFXVnpMbVp2Y2tWaFkyZ29aVzUwY25rZ1BUNGdaVzUwY25rdWNtVnRiM1psUVhSMGNtbGlkWFJsS0NkdVlXMWxKeWtwTzF4dWZUdGNibHh1WTI5dWMzUWdabWx1WkVacGNuTjBSVzUwY25rZ1BTQW9ZMmhoY2lrZ1BUNGdlMXh1WEhSc1pYUWdjMlZzWldOMGIzSWdQU0J6YjNKMFMyVjVJRDhnSnk1cWN5MWxiblJ5ZVMxMGFYUnNaU2NnT2lBbkxtcHpMV1Z1ZEhKNUxXRnlkR2x6ZENjN1hHNWNkR3hsZENCd2NtVjJVMlZzWldOMGIzSWdQU0FoYzI5eWRFdGxlU0EvSUNjdWFuTXRaVzUwY25rdGRHbDBiR1VuSURvZ0p5NXFjeTFsYm5SeWVTMWhjblJwYzNRbk8xeHVYSFJzWlhRZ0pHVnVkSEpwWlhNZ1BTQkJjbkpoZVM1bWNtOXRLR1J2WTNWdFpXNTBMbkYxWlhKNVUyVnNaV04wYjNKQmJHd29jMlZzWldOMGIzSXBLVHRjYmx4dVhIUmpiR1ZoY2tGdVkyaHZjbk1vY0hKbGRsTmxiR1ZqZEc5eUtUdGNibHh1WEhSeVpYUjFjbTRnSkdWdWRISnBaWE11Wm1sdVpDaGxiblJ5ZVNBOVBpQjdYRzVjZEZ4MGJHVjBJRzV2WkdVZ1BTQmxiblJ5ZVM1dVpYaDBSV3hsYldWdWRGTnBZbXhwYm1jN1hHNWNkRngwY21WMGRYSnVJRzV2WkdVdWFXNXVaWEpJVkUxTVd6QmRJRDA5UFNCamFHRnlJSHg4SUc1dlpHVXVhVzV1WlhKSVZFMU1XekJkSUQwOVBTQmphR0Z5TG5SdlZYQndaWEpEWVhObEtDazdYRzVjZEgwcE8xeHVmVHRjYmx4dVhHNWpiMjV6ZENCdFlXdGxRV3h3YUdGaVpYUWdQU0FvS1NBOVBpQjdYRzVjZEdOdmJuTjBJR0YwZEdGamFFRnVZMmh2Y2t4cGMzUmxibVZ5SUQwZ0tDUmhibU5vYjNJc0lHeGxkSFJsY2lrZ1BUNGdlMXh1WEhSY2RDUmhibU5vYjNJdVlXUmtSWFpsYm5STWFYTjBaVzVsY2lnblkyeHBZMnNuTENBb0tTQTlQaUI3WEc1Y2RGeDBYSFJqYjI1emRDQnNaWFIwWlhKT2IyUmxJRDBnWkc5amRXMWxiblF1WjJWMFJXeGxiV1Z1ZEVKNVNXUW9iR1YwZEdWeUtUdGNibHgwWEhSY2RHeGxkQ0IwWVhKblpYUTdYRzVjYmx4MFhIUmNkR2xtSUNnaGMyOXlkRXRsZVNrZ2UxeHVYSFJjZEZ4MFhIUjBZWEpuWlhRZ1BTQnNaWFIwWlhJZ1BUMDlJQ2RoSnlBL0lHUnZZM1Z0Wlc1MExtZGxkRVZzWlcxbGJuUkNlVWxrS0NkaGJtTm9iM0l0ZEdGeVoyVjBKeWtnT2lCc1pYUjBaWEpPYjJSbExuQmhjbVZ1ZEVWc1pXMWxiblF1Y0dGeVpXNTBSV3hsYldWdWRDNXdZWEpsYm5SRmJHVnRaVzUwTG5CaGNtVnVkRVZzWlcxbGJuUXVjSEpsZG1sdmRYTkZiR1Z0Wlc1MFUybGliR2x1Wnk1eGRXVnllVk5sYkdWamRHOXlLQ2N1YW5NdFlYSjBhV05zWlMxaGJtTm9iM0l0ZEdGeVoyVjBKeWs3WEc1Y2RGeDBYSFI5SUdWc2MyVWdlMXh1WEhSY2RGeDBYSFIwWVhKblpYUWdQU0JzWlhSMFpYSWdQVDA5SUNkaEp5QS9JR1J2WTNWdFpXNTBMbWRsZEVWc1pXMWxiblJDZVVsa0tDZGhibU5vYjNJdGRHRnlaMlYwSnlrZ09pQnNaWFIwWlhKT2IyUmxMbkJoY21WdWRFVnNaVzFsYm5RdWNHRnlaVzUwUld4bGJXVnVkQzV3WVhKbGJuUkZiR1Z0Wlc1MExuQnlaWFpwYjNWelJXeGxiV1Z1ZEZOcFlteHBibWN1Y1hWbGNubFRaV3hsWTNSdmNpZ25MbXB6TFdGeWRHbGpiR1V0WVc1amFHOXlMWFJoY21kbGRDY3BPMXh1WEhSY2RGeDBmVHRjYmx4dVhIUmNkRngwZEdGeVoyVjBMbk5qY205c2JFbHVkRzlXYVdWM0tIdGlaV2hoZG1sdmNqb2dYQ0p6Ylc5dmRHaGNJaXdnWW14dlkyczZJRndpYzNSaGNuUmNJbjBwTzF4dVhIUmNkSDBwTzF4dVhIUjlPMXh1WEc1Y2RHeGxkQ0JoWTNScGRtVkZiblJ5YVdWeklEMGdlMzA3WEc1Y2RHeGxkQ0FrYjNWMFpYSWdQU0JrYjJOMWJXVnVkQzV4ZFdWeWVWTmxiR1ZqZEc5eUtDY3VZV3h3YUdGaVpYUmZYMnhsZEhSbGNuTW5LVHRjYmx4MEpHOTFkR1Z5TG1sdWJtVnlTRlJOVENBOUlDY25PMXh1WEc1Y2RHRnNjR2hoWW1WMExtWnZja1ZoWTJnb2JHVjBkR1Z5SUQwK0lIdGNibHgwWEhSc1pYUWdKR1pwY25OMFJXNTBjbmtnUFNCbWFXNWtSbWx5YzNSRmJuUnllU2hzWlhSMFpYSXBPMXh1WEhSY2RHeGxkQ0FrWVc1amFHOXlJRDBnWkc5amRXMWxiblF1WTNKbFlYUmxSV3hsYldWdWRDZ25ZU2NwTzF4dVhHNWNkRngwYVdZZ0tDRWtabWx5YzNSRmJuUnllU2tnY21WMGRYSnVPMXh1WEc1Y2RGeDBKR1pwY25OMFJXNTBjbmt1YVdRZ1BTQnNaWFIwWlhJN1hHNWNkRngwSkdGdVkyaHZjaTVwYm01bGNraFVUVXdnUFNCc1pYUjBaWEl1ZEc5VmNIQmxja05oYzJVb0tUdGNibHgwWEhRa1lXNWphRzl5TG1Oc1lYTnpUbUZ0WlNBOUlDZGhiSEJvWVdKbGRGOWZiR1YwZEdWeUxXRnVZMmh2Y2ljN1hHNWNibHgwWEhSaGRIUmhZMmhCYm1Ob2IzSk1hWE4wWlc1bGNpZ2tZVzVqYUc5eUxDQnNaWFIwWlhJcE8xeHVYSFJjZENSdmRYUmxjaTVoY0hCbGJtUkRhR2xzWkNna1lXNWphRzl5S1R0Y2JseDBmU2s3WEc1OU8xeHVYRzVqYjI1emRDQnlaVzVrWlhKSmJXRm5aWE1nUFNBb2FXMWhaMlZ6TENBa2FXMWhaMlZ6S1NBOVBpQjdYRzVjZEdsdFlXZGxjeTVtYjNKRllXTm9LR2x0WVdkbElEMCtJSHRjYmx4MFhIUmpiMjV6ZENCemNtTWdQU0JnTGk0dkxpNHZZWE56WlhSekwybHRZV2RsY3k4a2UybHRZV2RsZldBN1hHNWNkRngwWTI5dWMzUWdKR2x0WjA5MWRHVnlJRDBnWkc5amRXMWxiblF1WTNKbFlYUmxSV3hsYldWdWRDZ25aR2wySnlrN1hHNWNkRngwWTI5dWMzUWdKR2x0WnlBOUlHUnZZM1Z0Wlc1MExtTnlaV0YwWlVWc1pXMWxiblFvSjBsTlJ5Y3BPMXh1WEhSY2RDUnBiV2N1WTJ4aGMzTk9ZVzFsSUQwZ0oyRnlkR2xqYkdVdGFXMWhaMlVuTzF4dVhIUmNkQ1JwYldjdWMzSmpJRDBnYzNKak8xeHVYSFJjZENScGJXZFBkWFJsY2k1aGNIQmxibVJEYUdsc1pDZ2thVzFuS1R0Y2JseDBYSFFrYVcxaFoyVnpMbUZ3Y0dWdVpFTm9hV3hrS0NScGJXZFBkWFJsY2lrN1hHNWNkSDBwWEc1OU8xeHVYRzVqYjI1emRDQnlaVzVrWlhKRmJuUnlhV1Z6SUQwZ0tDa2dQVDRnZTF4dVhIUmpiMjV6ZENBa1lYSjBhV05zWlV4cGMzUWdQU0JrYjJOMWJXVnVkQzVuWlhSRmJHVnRaVzUwUW5sSlpDZ25hbk10YkdsemRDY3BPMXh1WEhSamIyNXpkQ0JsYm5SeWFXVnpUR2x6ZENBOUlITnZjblJMWlhrZ1B5QmxiblJ5YVdWekxtSjVWR2wwYkdVZ09pQmxiblJ5YVdWekxtSjVRWFYwYUc5eU8xeHVYRzVjZENSaGNuUnBZMnhsVEdsemRDNXBibTVsY2toVVRVd2dQU0FuSnp0Y2JseHVYSFJsYm5SeWFXVnpUR2x6ZEM1bWIzSkZZV05vS0dWdWRISjVJRDArSUh0Y2JseDBYSFJqYjI1emRDQjdJSFJwZEd4bExDQnNZWE4wVG1GdFpTd2dabWx5YzNST1lXMWxMQ0JwYldGblpYTXNJR1JsYzJOeWFYQjBhVzl1TENCa1pYUmhhV3dnZlNBOUlHVnVkSEo1TzF4dVhHNWNkRngwSkdGeWRHbGpiR1ZNYVhOMExtbHVjMlZ5ZEVGa2FtRmpaVzUwU0ZSTlRDZ25ZbVZtYjNKbFpXNWtKeXdnWVhKMGFXTnNaVlJsYlhCc1lYUmxLVHRjYmx4dVhIUmNkR052Ym5OMElDUmhiR3hUYkdsa1pYSnpJRDBnWkc5amRXMWxiblF1Y1hWbGNubFRaV3hsWTNSdmNrRnNiQ2duTG1GeWRHbGpiR1ZmWDNOc2FXUmxjaTFwYm01bGNpY3BPMXh1WEhSY2RHTnZibk4wSUNSemJHbGtaWElnUFNBa1lXeHNVMnhwWkdWeWMxc2tZV3hzVTJ4cFpHVnljeTVzWlc1bmRHZ2dMU0F4WFR0Y2JseDBYSFF2THlCamIyNXpkQ0FrYVcxaFoyVnpJRDBnSkhOc2FXUmxjaTV4ZFdWeWVWTmxiR1ZqZEc5eUtDY3VZWEowYVdOc1pWOWZhVzFoWjJWekp5azdYRzVjYmx4MFhIUnBaaUFvYVcxaFoyVnpMbXhsYm1kMGFDa2djbVZ1WkdWeVNXMWhaMlZ6S0dsdFlXZGxjeXdnSkhOc2FXUmxjaWs3WEc1Y2RGeDBYRzVjZEZ4MFkyOXVjM1FnSkdSbGMyTnlhWEIwYVc5dVQzVjBaWElnUFNCa2IyTjFiV1Z1ZEM1amNtVmhkR1ZGYkdWdFpXNTBLQ2RrYVhZbktUdGNibHgwWEhSamIyNXpkQ0FrWkdWelkzSnBjSFJwYjI1T2IyUmxJRDBnWkc5amRXMWxiblF1WTNKbFlYUmxSV3hsYldWdWRDZ25jQ2NwTzF4dVhIUmNkR052Ym5OMElDUmtaWFJoYVd4T2IyUmxJRDBnWkc5amRXMWxiblF1WTNKbFlYUmxSV3hsYldWdWRDZ25jQ2NwTzF4dVhIUmNkQ1JrWlhOamNtbHdkR2x2Yms5MWRHVnlMbU5zWVhOelRHbHpkQzVoWkdRb0oyRnlkR2xqYkdVdFpHVnpZM0pwY0hScGIyNWZYMjkxZEdWeUp5azdYRzVjZEZ4MEpHUmxjMk55YVhCMGFXOXVUbTlrWlM1amJHRnpjMHhwYzNRdVlXUmtLQ2RoY25ScFkyeGxMV1JsYzJOeWFYQjBhVzl1SnlrN1hHNWNkRngwSkdSbGRHRnBiRTV2WkdVdVkyeGhjM05NYVhOMExtRmtaQ2duWVhKMGFXTnNaUzFrWlhSaGFXd25LVHRjYmx4dVhIUmNkQ1JrWlhOamNtbHdkR2x2Yms1dlpHVXVhVzV1WlhKSVZFMU1JRDBnWkdWelkzSnBjSFJwYjI0N1hHNWNkRngwSkdSbGRHRnBiRTV2WkdVdWFXNXVaWEpJVkUxTUlEMGdaR1YwWVdsc08xeHVYRzVjZEZ4MEpHUmxjMk55YVhCMGFXOXVUM1YwWlhJdVlYQndaVzVrUTJocGJHUW9KR1JsYzJOeWFYQjBhVzl1VG05a1pTd2dKR1JsZEdGcGJFNXZaR1VwTzF4dVhIUmNkQ1J6Ykdsa1pYSXVZWEJ3Wlc1a1EyaHBiR1FvSkdSbGMyTnlhWEIwYVc5dVQzVjBaWElwTzF4dVhHNWNkRngwWTI5dWMzUWdKSFJwZEd4bFRtOWtaWE1nUFNCa2IyTjFiV1Z1ZEM1eGRXVnllVk5sYkdWamRHOXlRV3hzS0NjdVlYSjBhV05zWlMxb1pXRmthVzVuWDE5MGFYUnNaU2NwTzF4dVhIUmNkR052Ym5OMElDUjBhWFJzWlNBOUlDUjBhWFJzWlU1dlpHVnpXeVIwYVhSc1pVNXZaR1Z6TG14bGJtZDBhQ0F0SURGZE8xeHVYRzVjZEZ4MFkyOXVjM1FnSkdacGNuTjBUbTlrWlhNZ1BTQmtiMk4xYldWdWRDNXhkV1Z5ZVZObGJHVmpkRzl5UVd4c0tDY3VZWEowYVdOc1pTMW9aV0ZrYVc1blgxOXVZVzFsTFMxbWFYSnpkQ2NwTzF4dVhIUmNkR052Ym5OMElDUm1hWEp6ZENBOUlDUm1hWEp6ZEU1dlpHVnpXeVJtYVhKemRFNXZaR1Z6TG14bGJtZDBhQ0F0SURGZE8xeHVYRzVjZEZ4MFkyOXVjM1FnSkd4aGMzUk9iMlJsY3lBOUlHUnZZM1Z0Wlc1MExuRjFaWEo1VTJWc1pXTjBiM0pCYkd3b0p5NWhjblJwWTJ4bExXaGxZV1JwYm1kZlgyNWhiV1V0TFd4aGMzUW5LVHRjYmx4MFhIUmpiMjV6ZENBa2JHRnpkQ0E5SUNSc1lYTjBUbTlrWlhOYkpHeGhjM1JPYjJSbGN5NXNaVzVuZEdnZ0xTQXhYVHRjYmx4dVhIUmNkQ1IwYVhSc1pTNXBibTVsY2toVVRVd2dQU0IwYVhSc1pUdGNibHgwWEhRa1ptbHljM1F1YVc1dVpYSklWRTFNSUQwZ1ptbHljM1JPWVcxbE8xeHVYSFJjZENSc1lYTjBMbWx1Ym1WeVNGUk5UQ0E5SUd4aGMzUk9ZVzFsTzF4dVhHNWNkRngwWTI5dWMzUWdKR0Z5Y205M1RtVjRkQ0E5SUNSemJHbGtaWEl1Y0dGeVpXNTBSV3hsYldWdWRDNXhkV1Z5ZVZObGJHVmpkRzl5S0NjdVlYSnliM2N0Ym1WNGRDY3BPMXh1WEhSY2RHTnZibk4wSUNSaGNuSnZkMUJ5WlhZZ1BTQWtjMnhwWkdWeUxuQmhjbVZ1ZEVWc1pXMWxiblF1Y1hWbGNubFRaV3hsWTNSdmNpZ25MbUZ5Y205M0xYQnlaWFluS1R0Y2JseHVYSFJjZEd4bGRDQmpkWEp5Wlc1MElEMGdKSE5zYVdSbGNpNW1hWEp6ZEVWc1pXMWxiblJEYUdsc1pEdGNibHgwWEhRa1lYSnliM2RPWlhoMExtRmtaRVYyWlc1MFRHbHpkR1Z1WlhJb0oyTnNhV05ySnl3Z0tDa2dQVDRnZTF4dVhIUmNkRngwWTI5dWMzUWdibVY0ZENBOUlHTjFjbkpsYm5RdWJtVjRkRVZzWlcxbGJuUlRhV0pzYVc1bk8xeHVYSFJjZEZ4MGFXWWdLRzVsZUhRcElIdGNibHgwWEhSY2RGeDBibVY0ZEM1elkzSnZiR3hKYm5SdlZtbGxkeWg3WW1Wb1lYWnBiM0k2SUZ3aWMyMXZiM1JvWENJc0lHSnNiMk5yT2lCY0ltNWxZWEpsYzNSY0lpd2dhVzVzYVc1bE9pQmNJbU5sYm5SbGNsd2lmU2s3WEc1Y2RGeDBYSFJjZEdOMWNuSmxiblFnUFNCdVpYaDBPMXh1WEhSY2RGeDBmVnh1WEhSY2RIMHBPMXh1WEc1Y2RGeDBKR0Z5Y205M1VISmxkaTVoWkdSRmRtVnVkRXhwYzNSbGJtVnlLQ2RqYkdsamF5Y3NJQ2dwSUQwK0lIdGNibHgwWEhSY2RHTnZibk4wSUhCeVpYWWdQU0JqZFhKeVpXNTBMbkJ5WlhacGIzVnpSV3hsYldWdWRGTnBZbXhwYm1jN1hHNWNkRngwWEhScFppQW9jSEpsZGlrZ2UxeHVYSFJjZEZ4MFhIUndjbVYyTG5OamNtOXNiRWx1ZEc5V2FXVjNLSHRpWldoaGRtbHZjam9nWENKemJXOXZkR2hjSWl3Z1lteHZZMnM2SUZ3aWJtVmhjbVZ6ZEZ3aUxDQnBibXhwYm1VNklGd2lZMlZ1ZEdWeVhDSjlLVHRjYmx4MFhIUmNkRngwWTNWeWNtVnVkQ0E5SUhCeVpYWTdYRzVjZEZ4MFhIUjlYRzVjZEZ4MGZTbGNibHgwZlNrN1hHNWNibHgwWVhSMFlXTm9TVzFoWjJWTWFYTjBaVzVsY25Nb0tUdGNibHgwYldGclpVRnNjR2hoWW1WMEtDazdYRzU5TzF4dVhHNHZMeUIwYUdseklHNWxaV1J6SUhSdklHSmxJR0VnWkdWbGNHVnlJSE52Y25SY2JtTnZibk4wSUhOdmNuUkNlVlJwZEd4bElEMGdLQ2tnUFQ0Z2UxeHVYSFJsYm5SeWFXVnpMbUo1VkdsMGJHVXVjMjl5ZENnb1lTd2dZaWtnUFQ0Z2UxeHVYSFJjZEd4bGRDQmhWR2wwYkdVZ1BTQmhMblJwZEd4bFd6QmRMblJ2VlhCd1pYSkRZWE5sS0NrN1hHNWNkRngwYkdWMElHSlVhWFJzWlNBOUlHSXVkR2wwYkdWYk1GMHVkRzlWY0hCbGNrTmhjMlVvS1R0Y2JseDBYSFJwWmlBb1lWUnBkR3hsSUQ0Z1lsUnBkR3hsS1NCeVpYUjFjbTRnTVR0Y2JseDBYSFJsYkhObElHbG1JQ2hoVkdsMGJHVWdQQ0JpVkdsMGJHVXBJSEpsZEhWeWJpQXRNVHRjYmx4MFhIUmxiSE5sSUhKbGRIVnliaUF3TzF4dVhIUjlLVHRjYm4wN1hHNWNibU52Ym5OMElITmxkRVJoZEdFZ1BTQW9aR0YwWVNrZ1BUNGdlMXh1WEhSbGJuUnlhV1Z6TG1KNVFYVjBhRzl5SUQwZ1pHRjBZVHRjYmx4MFpXNTBjbWxsY3k1aWVWUnBkR3hsSUQwZ1pHRjBZUzV6YkdsalpTZ3BPeUF2THlCamIzQnBaWE1nWkdGMFlTQm1iM0lnWW5sVWFYUnNaU0J6YjNKMFhHNWNkSE52Y25SQ2VWUnBkR3hsS0NrN1hHNWNkSEpsYm1SbGNrVnVkSEpwWlhNb0tUdGNibjFjYmx4dVkyOXVjM1FnWm1WMFkyaEVZWFJoSUQwZ0tDa2dQVDRnZTF4dVhIUmNkR1psZEdOb0tFUkNLUzUwYUdWdUtISmxjeUE5UGx4dVhIUmNkRngwY21WekxtcHpiMjRvS1Z4dVhIUmNkQ2t1ZEdobGJpaGtZWFJoSUQwK0lIdGNibHgwWEhSY2RITmxkRVJoZEdFb1pHRjBZU2s3WEc1Y2RGeDBmU2xjYmx4MFhIUXVkR2hsYmlnb0tTQTlQaUI3WEc1Y2RGeDBYSFFrYkc5aFpHbHVaeTVtYjNKRllXTm9LR1ZzWlcwZ1BUNGdaV3hsYlM1amJHRnpjMHhwYzNRdVlXUmtLQ2R5WldGa2VTY3BLVHRjYmx4MFhIUmNkQ1J1WVhZdVkyeGhjM05NYVhOMExtRmtaQ2duY21WaFpIa25LVHRjYmx4MFhIUjlLVnh1WEhSY2RDNWpZWFJqYUNobGNuSWdQVDRnWTI5dWMyOXNaUzUzWVhKdUtHVnljaWtwTzF4dWZUdGNibHh1WTI5dWMzUWdhVzVwZENBOUlDZ3BJRDArSUh0Y2JseDBjMjF2YjNSb2MyTnliMnhzTG5CdmJIbG1hV3hzS0NrN1hHNWNkR1psZEdOb1JHRjBZU2dwTzF4dVhIUnVZWFpNWnlncE8xeHVYSFJ5Wlc1a1pYSkZiblJ5YVdWektDazdYRzVjZEdGa1pGTnZjblJDZFhSMGIyNU1hWE4wWlc1bGNuTW9LVHRjYmx4MFlYUjBZV05vUVhKeWIzZE1hWE4wWlc1bGNuTW9LVHRjYmx4MFlYUjBZV05vVFc5a1lXeE1hWE4wWlc1bGNuTW9LVHRjYm4xY2JseHVhVzVwZENncE8xeHVJaXdpWTI5dWMzUWdZWEowYVdOc1pWUmxiWEJzWVhSbElEMGdZRnh1WEhROFlYSjBhV05zWlNCamJHRnpjejFjSW1GeWRHbGpiR1ZmWDI5MWRHVnlYQ0krWEc1Y2RGeDBQR1JwZGlCamJHRnpjejFjSW1GeWRHbGpiR1ZmWDJsdWJtVnlYQ0krWEc1Y2RGeDBYSFE4WkdsMklHTnNZWE56UFZ3aVlYSjBhV05zWlY5ZmFHVmhaR2x1WjF3aVBseHVYSFJjZEZ4MFhIUThZU0JqYkdGemN6MWNJbXB6TFdWdWRISjVMWFJwZEd4bFhDSStQQzloUGx4dVhIUmNkRngwWEhROGFESWdZMnhoYzNNOVhDSmhjblJwWTJ4bExXaGxZV1JwYm1kZlgzUnBkR3hsWENJK1BDOW9NajVjYmx4MFhIUmNkRngwUEdScGRpQmpiR0Z6Y3oxY0ltRnlkR2xqYkdVdGFHVmhaR2x1WjE5ZmJtRnRaVndpUGx4dVhIUmNkRngwWEhSY2REeHpjR0Z1SUdOc1lYTnpQVndpWVhKMGFXTnNaUzFvWldGa2FXNW5YMTl1WVcxbExTMW1hWEp6ZEZ3aVBqd3ZjM0JoYmo1Y2JseDBYSFJjZEZ4MFhIUThZU0JqYkdGemN6MWNJbXB6TFdWdWRISjVMV0Z5ZEdsemRGd2lQand2WVQ1Y2JseDBYSFJjZEZ4MFhIUThjM0JoYmlCamJHRnpjejFjSW1GeWRHbGpiR1V0YUdWaFpHbHVaMTlmYm1GdFpTMHRiR0Z6ZEZ3aVBqd3ZjM0JoYmo1Y2JseDBYSFJjZEZ4MFBDOWthWFkrWEc1Y2RGeDBYSFE4TDJScGRqNWNkRnh1WEhSY2RGeDBQR1JwZGlCamJHRnpjejFjSW1GeWRHbGpiR1ZmWDNOc2FXUmxjaTF2ZFhSbGNsd2lQbHh1WEhSY2RGeDBYSFE4WkdsMklHTnNZWE56UFZ3aVlYSjBhV05zWlY5ZmMyeHBaR1Z5TFdsdWJtVnlYQ0krUEM5a2FYWStYRzVjZEZ4MFhIUmNkRHhrYVhZZ1kyeGhjM005WENKaGNuUnBZMnhsWDE5elkzSnZiR3d0WTI5dWRISnZiSE5jSWo1Y2JseDBYSFJjZEZ4MFhIUThjM0JoYmlCamJHRnpjejFjSW1OdmJuUnliMnh6SUdGeWNtOTNMWEJ5WlhaY0lqN2locEE4TDNOd1lXNCtJRnh1WEhSY2RGeDBYSFJjZER4emNHRnVJR05zWVhOelBWd2lZMjl1ZEhKdmJITWdZWEp5YjNjdGJtVjRkRndpUHVLR2tqd3ZjM0JoYmo1Y2JseDBYSFJjZEZ4MFBDOWthWFkrWEc1Y2RGeDBYSFJjZER4d0lHTnNZWE56UFZ3aWFuTXRZWEowYVdOc1pTMWhibU5vYjNJdGRHRnlaMlYwWENJK1BDOXdQbHh1WEhSY2REd3ZaR2wyUGx4dVhIUThMMkZ5ZEdsamJHVStYRzVnTzF4dVhHNWxlSEJ2Y25RZ1pHVm1ZWFZzZENCaGNuUnBZMnhsVkdWdGNHeGhkR1U3SWl3aWFXMXdiM0owSUdGeWRHbGpiR1ZVWlcxd2JHRjBaU0JtY205dElDY3VMMkZ5ZEdsamJHVW5PMXh1YVcxd2IzSjBJRzVoZGt4bklHWnliMjBnSnk0dmJtRjJUR2NuTzF4dVhHNWxlSEJ2Y25RZ2V5QmhjblJwWTJ4bFZHVnRjR3hoZEdVc0lHNWhka3huSUgwN0lpd2lZMjl1YzNRZ2RHVnRjR3hoZEdVZ1BTQmNibHgwWUR4a2FYWWdZMnhoYzNNOVhDSnVZWFpmWDJsdWJtVnlYQ0krWEc1Y2RGeDBQR1JwZGlCamJHRnpjejFjSW01aGRsOWZjMjl5ZEMxaWVWd2lQbHh1WEhSY2RGeDBQSE53WVc0Z1kyeGhjM005WENKemIzSjBMV0o1WDE5MGFYUnNaVndpUGxOdmNuUWdZbms4TDNOd1lXNCtYRzVjZEZ4MFhIUThZblYwZEc5dUlHTnNZWE56UFZ3aWMyOXlkQzFpZVNCemIzSjBMV0o1WDE5aWVTMWhjblJwYzNRZ1lXTjBhWFpsWENJZ2FXUTlYQ0pxY3kxaWVTMWhjblJwYzNSY0lqNUJjblJwYzNROEwySjFkSFJ2Ymo1Y2JseDBYSFJjZER4emNHRnVJR05zWVhOelBWd2ljMjl5ZEMxaWVWOWZaR2wyYVdSbGNsd2lQaUI4SUR3dmMzQmhiajVjYmx4MFhIUmNkRHhpZFhSMGIyNGdZMnhoYzNNOVhDSnpiM0owTFdKNUlITnZjblF0WW5sZlgySjVMWFJwZEd4bFhDSWdhV1E5WENKcWN5MWllUzEwYVhSc1pWd2lQbFJwZEd4bFBDOWlkWFIwYjI0K1hHNWNkRngwWEhROGMzQmhiaUJqYkdGemN6MWNJbVpwYm1SY0lpQnBaRDFjSW1wekxXWnBibVJjSWo1Y2JseDBYSFJjZEZ4MEtEeHpjR0Z1SUdOc1lYTnpQVndpWm1sdVpDMHRhVzV1WlhKY0lqNG1Jemc1T0RRN1Jqd3ZjM0JoYmo0cFhHNWNkRngwWEhROEwzTndZVzQrWEc1Y2RGeDBQQzlrYVhZK1hHNWNkRngwUEdScGRpQmpiR0Z6Y3oxY0ltNWhkbDlmWVd4d2FHRmlaWFJjSWo1Y2JseDBYSFJjZER4emNHRnVJR05zWVhOelBWd2lZV3h3YUdGaVpYUmZYM1JwZEd4bFhDSStSMjhnZEc4OEwzTndZVzQrWEc1Y2RGeDBYSFE4WkdsMklHTnNZWE56UFZ3aVlXeHdhR0ZpWlhSZlgyeGxkSFJsY25OY0lqNDhMMlJwZGo1Y2JseDBYSFE4TDJScGRqNWNibHgwUEM5a2FYWStZRHRjYmx4dVkyOXVjM1FnYm1GMlRHY2dQU0FvS1NBOVBpQjdYRzVjZEd4bGRDQnVZWFpQZFhSbGNpQTlJR1J2WTNWdFpXNTBMbWRsZEVWc1pXMWxiblJDZVVsa0tDZHFjeTF1WVhZbktUdGNibHgwYm1GMlQzVjBaWEl1YVc1dVpYSklWRTFNSUQwZ2RHVnRjR3hoZEdVN1hHNTlPMXh1WEc1bGVIQnZjblFnWkdWbVlYVnNkQ0J1WVhaTVp6c2lMQ0pqYjI1emRDQmtaV0p2ZFc1alpTQTlJQ2htYml3Z2RHbHRaU2tnUFQ0Z2UxeHVJQ0JzWlhRZ2RHbHRaVzkxZER0Y2JseHVJQ0J5WlhSMWNtNGdablZ1WTNScGIyNG9LU0I3WEc0Z0lDQWdZMjl1YzNRZ1puVnVZM1JwYjI1RFlXeHNJRDBnS0NrZ1BUNGdabTR1WVhCd2JIa29kR2hwY3l3Z1lYSm5kVzFsYm5SektUdGNiaUFnSUNCY2JpQWdJQ0JqYkdWaGNsUnBiV1Z2ZFhRb2RHbHRaVzkxZENrN1hHNGdJQ0FnZEdsdFpXOTFkQ0E5SUhObGRGUnBiV1Z2ZFhRb1puVnVZM1JwYjI1RFlXeHNMQ0IwYVcxbEtUdGNiaUFnZlZ4dWZUdGNibHh1Wlhod2IzSjBJSHNnWkdWaWIzVnVZMlVnZlRzaVhYMD0ifQ==
