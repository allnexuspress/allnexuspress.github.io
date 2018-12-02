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
				// let type = img.width >= img.height ? 'l' : 'p';

				$lightbox.classList.add('show-img');
				$view.setAttribute('style', 'background-image: url(' + src + ')');
				lightbox = true;
			}
		});
	});

	$view.addEventListener('click', function () {
		if (lightbox) {
			$lightbox.classList.remove('show-img');
			$lightbox.firstElementChild.classList.remove('view-x2');
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

},{"./article-template":2,"./nav-lg":4,"smoothscroll-polyfill":1}],4:[function(require,module,exports){
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

},{}]},{},[3])

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvc21vb3Roc2Nyb2xsLXBvbHlmaWxsL2Rpc3Qvc21vb3Roc2Nyb2xsLmpzIiwic3JjL2pzL2FydGljbGUtdGVtcGxhdGUuanMiLCJzcmMvanMvaW5kZXguanMiLCJzcmMvanMvbmF2LWxnLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFD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SSxJQUFKLEVBRGM7QUFBQSxFQUFmLEVBRUUsSUFGRixDQUVPLGdCQUFRO0FBQ2QsVUFBUSxJQUFSO0FBQ0EsRUFKRCxFQUtDLElBTEQsQ0FLTSxZQUFNO0FBQ1gsV0FBUyxPQUFULENBQWlCO0FBQUEsVUFBUSxLQUFLLFNBQUwsQ0FBZSxHQUFmLENBQW1CLE9BQW5CLENBQVI7QUFBQSxHQUFqQjtBQUNBLE9BQUssU0FBTCxDQUFlLEdBQWYsQ0FBbUIsT0FBbkI7QUFDQSxFQVJELEVBU0MsS0FURCxDQVNPO0FBQUEsU0FBTyxRQUFRLElBQVIsQ0FBYSxHQUFiLENBQVA7QUFBQSxFQVRQO0FBVUQsQ0FYRDs7QUFhQSxJQUFNLE9BQU8sU0FBUCxJQUFPLEdBQU07QUFDbEIsZ0NBQWEsUUFBYjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLENBUkQ7O0FBVUE7Ozs7Ozs7O0FDbFRBLElBQU0sbW1CQUFOOztBQWlCQSxJQUFNLFFBQVEsU0FBUixLQUFRLEdBQU07QUFDbkIsS0FBSSxXQUFXLFNBQVMsY0FBVCxDQUF3QixRQUF4QixDQUFmO0FBQ0EsVUFBUyxTQUFULEdBQXFCLFFBQXJCO0FBQ0EsQ0FIRDs7a0JBS2UsSyIsImZpbGUiOiJidW5kbGUuanMiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24oKXtmdW5jdGlvbiByKGUsbix0KXtmdW5jdGlvbiBvKGksZil7aWYoIW5baV0pe2lmKCFlW2ldKXt2YXIgYz1cImZ1bmN0aW9uXCI9PXR5cGVvZiByZXF1aXJlJiZyZXF1aXJlO2lmKCFmJiZjKXJldHVybiBjKGksITApO2lmKHUpcmV0dXJuIHUoaSwhMCk7dmFyIGE9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitpK1wiJ1wiKTt0aHJvdyBhLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsYX12YXIgcD1uW2ldPXtleHBvcnRzOnt9fTtlW2ldWzBdLmNhbGwocC5leHBvcnRzLGZ1bmN0aW9uKHIpe3ZhciBuPWVbaV1bMV1bcl07cmV0dXJuIG8obnx8cil9LHAscC5leHBvcnRzLHIsZSxuLHQpfXJldHVybiBuW2ldLmV4cG9ydHN9Zm9yKHZhciB1PVwiZnVuY3Rpb25cIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmUsaT0wO2k8dC5sZW5ndGg7aSsrKW8odFtpXSk7cmV0dXJuIG99cmV0dXJuIHJ9KSgpIiwiLyogc21vb3Roc2Nyb2xsIHYwLjQuMCAtIDIwMTggLSBEdXN0YW4gS2FzdGVuLCBKZXJlbWlhcyBNZW5pY2hlbGxpIC0gTUlUIExpY2Vuc2UgKi9cbihmdW5jdGlvbiAoKSB7XG4gICd1c2Ugc3RyaWN0JztcblxuICAvLyBwb2x5ZmlsbFxuICBmdW5jdGlvbiBwb2x5ZmlsbCgpIHtcbiAgICAvLyBhbGlhc2VzXG4gICAgdmFyIHcgPSB3aW5kb3c7XG4gICAgdmFyIGQgPSBkb2N1bWVudDtcblxuICAgIC8vIHJldHVybiBpZiBzY3JvbGwgYmVoYXZpb3IgaXMgc3VwcG9ydGVkIGFuZCBwb2x5ZmlsbCBpcyBub3QgZm9yY2VkXG4gICAgaWYgKFxuICAgICAgJ3Njcm9sbEJlaGF2aW9yJyBpbiBkLmRvY3VtZW50RWxlbWVudC5zdHlsZSAmJlxuICAgICAgdy5fX2ZvcmNlU21vb3RoU2Nyb2xsUG9seWZpbGxfXyAhPT0gdHJ1ZVxuICAgICkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIC8vIGdsb2JhbHNcbiAgICB2YXIgRWxlbWVudCA9IHcuSFRNTEVsZW1lbnQgfHwgdy5FbGVtZW50O1xuICAgIHZhciBTQ1JPTExfVElNRSA9IDQ2ODtcblxuICAgIC8vIG9iamVjdCBnYXRoZXJpbmcgb3JpZ2luYWwgc2Nyb2xsIG1ldGhvZHNcbiAgICB2YXIgb3JpZ2luYWwgPSB7XG4gICAgICBzY3JvbGw6IHcuc2Nyb2xsIHx8IHcuc2Nyb2xsVG8sXG4gICAgICBzY3JvbGxCeTogdy5zY3JvbGxCeSxcbiAgICAgIGVsZW1lbnRTY3JvbGw6IEVsZW1lbnQucHJvdG90eXBlLnNjcm9sbCB8fCBzY3JvbGxFbGVtZW50LFxuICAgICAgc2Nyb2xsSW50b1ZpZXc6IEVsZW1lbnQucHJvdG90eXBlLnNjcm9sbEludG9WaWV3XG4gICAgfTtcblxuICAgIC8vIGRlZmluZSB0aW1pbmcgbWV0aG9kXG4gICAgdmFyIG5vdyA9XG4gICAgICB3LnBlcmZvcm1hbmNlICYmIHcucGVyZm9ybWFuY2Uubm93XG4gICAgICAgID8gdy5wZXJmb3JtYW5jZS5ub3cuYmluZCh3LnBlcmZvcm1hbmNlKVxuICAgICAgICA6IERhdGUubm93O1xuXG4gICAgLyoqXG4gICAgICogaW5kaWNhdGVzIGlmIGEgdGhlIGN1cnJlbnQgYnJvd3NlciBpcyBtYWRlIGJ5IE1pY3Jvc29mdFxuICAgICAqIEBtZXRob2QgaXNNaWNyb3NvZnRCcm93c2VyXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IHVzZXJBZ2VudFxuICAgICAqIEByZXR1cm5zIHtCb29sZWFufVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGlzTWljcm9zb2Z0QnJvd3Nlcih1c2VyQWdlbnQpIHtcbiAgICAgIHZhciB1c2VyQWdlbnRQYXR0ZXJucyA9IFsnTVNJRSAnLCAnVHJpZGVudC8nLCAnRWRnZS8nXTtcblxuICAgICAgcmV0dXJuIG5ldyBSZWdFeHAodXNlckFnZW50UGF0dGVybnMuam9pbignfCcpKS50ZXN0KHVzZXJBZ2VudCk7XG4gICAgfVxuXG4gICAgLypcbiAgICAgKiBJRSBoYXMgcm91bmRpbmcgYnVnIHJvdW5kaW5nIGRvd24gY2xpZW50SGVpZ2h0IGFuZCBjbGllbnRXaWR0aCBhbmRcbiAgICAgKiByb3VuZGluZyB1cCBzY3JvbGxIZWlnaHQgYW5kIHNjcm9sbFdpZHRoIGNhdXNpbmcgZmFsc2UgcG9zaXRpdmVzXG4gICAgICogb24gaGFzU2Nyb2xsYWJsZVNwYWNlXG4gICAgICovXG4gICAgdmFyIFJPVU5ESU5HX1RPTEVSQU5DRSA9IGlzTWljcm9zb2Z0QnJvd3Nlcih3Lm5hdmlnYXRvci51c2VyQWdlbnQpID8gMSA6IDA7XG5cbiAgICAvKipcbiAgICAgKiBjaGFuZ2VzIHNjcm9sbCBwb3NpdGlvbiBpbnNpZGUgYW4gZWxlbWVudFxuICAgICAqIEBtZXRob2Qgc2Nyb2xsRWxlbWVudFxuICAgICAqIEBwYXJhbSB7TnVtYmVyfSB4XG4gICAgICogQHBhcmFtIHtOdW1iZXJ9IHlcbiAgICAgKiBAcmV0dXJucyB7dW5kZWZpbmVkfVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIHNjcm9sbEVsZW1lbnQoeCwgeSkge1xuICAgICAgdGhpcy5zY3JvbGxMZWZ0ID0geDtcbiAgICAgIHRoaXMuc2Nyb2xsVG9wID0geTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiByZXR1cm5zIHJlc3VsdCBvZiBhcHBseWluZyBlYXNlIG1hdGggZnVuY3Rpb24gdG8gYSBudW1iZXJcbiAgICAgKiBAbWV0aG9kIGVhc2VcbiAgICAgKiBAcGFyYW0ge051bWJlcn0ga1xuICAgICAqIEByZXR1cm5zIHtOdW1iZXJ9XG4gICAgICovXG4gICAgZnVuY3Rpb24gZWFzZShrKSB7XG4gICAgICByZXR1cm4gMC41ICogKDEgLSBNYXRoLmNvcyhNYXRoLlBJICogaykpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIGluZGljYXRlcyBpZiBhIHNtb290aCBiZWhhdmlvciBzaG91bGQgYmUgYXBwbGllZFxuICAgICAqIEBtZXRob2Qgc2hvdWxkQmFpbE91dFxuICAgICAqIEBwYXJhbSB7TnVtYmVyfE9iamVjdH0gZmlyc3RBcmdcbiAgICAgKiBAcmV0dXJucyB7Qm9vbGVhbn1cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBzaG91bGRCYWlsT3V0KGZpcnN0QXJnKSB7XG4gICAgICBpZiAoXG4gICAgICAgIGZpcnN0QXJnID09PSBudWxsIHx8XG4gICAgICAgIHR5cGVvZiBmaXJzdEFyZyAhPT0gJ29iamVjdCcgfHxcbiAgICAgICAgZmlyc3RBcmcuYmVoYXZpb3IgPT09IHVuZGVmaW5lZCB8fFxuICAgICAgICBmaXJzdEFyZy5iZWhhdmlvciA9PT0gJ2F1dG8nIHx8XG4gICAgICAgIGZpcnN0QXJnLmJlaGF2aW9yID09PSAnaW5zdGFudCdcbiAgICAgICkge1xuICAgICAgICAvLyBmaXJzdCBhcmd1bWVudCBpcyBub3QgYW4gb2JqZWN0L251bGxcbiAgICAgICAgLy8gb3IgYmVoYXZpb3IgaXMgYXV0bywgaW5zdGFudCBvciB1bmRlZmluZWRcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9XG5cbiAgICAgIGlmICh0eXBlb2YgZmlyc3RBcmcgPT09ICdvYmplY3QnICYmIGZpcnN0QXJnLmJlaGF2aW9yID09PSAnc21vb3RoJykge1xuICAgICAgICAvLyBmaXJzdCBhcmd1bWVudCBpcyBhbiBvYmplY3QgYW5kIGJlaGF2aW9yIGlzIHNtb290aFxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG5cbiAgICAgIC8vIHRocm93IGVycm9yIHdoZW4gYmVoYXZpb3IgaXMgbm90IHN1cHBvcnRlZFxuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcbiAgICAgICAgJ2JlaGF2aW9yIG1lbWJlciBvZiBTY3JvbGxPcHRpb25zICcgK1xuICAgICAgICAgIGZpcnN0QXJnLmJlaGF2aW9yICtcbiAgICAgICAgICAnIGlzIG5vdCBhIHZhbGlkIHZhbHVlIGZvciBlbnVtZXJhdGlvbiBTY3JvbGxCZWhhdmlvci4nXG4gICAgICApO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIGluZGljYXRlcyBpZiBhbiBlbGVtZW50IGhhcyBzY3JvbGxhYmxlIHNwYWNlIGluIHRoZSBwcm92aWRlZCBheGlzXG4gICAgICogQG1ldGhvZCBoYXNTY3JvbGxhYmxlU3BhY2VcbiAgICAgKiBAcGFyYW0ge05vZGV9IGVsXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IGF4aXNcbiAgICAgKiBAcmV0dXJucyB7Qm9vbGVhbn1cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBoYXNTY3JvbGxhYmxlU3BhY2UoZWwsIGF4aXMpIHtcbiAgICAgIGlmIChheGlzID09PSAnWScpIHtcbiAgICAgICAgcmV0dXJuIGVsLmNsaWVudEhlaWdodCArIFJPVU5ESU5HX1RPTEVSQU5DRSA8IGVsLnNjcm9sbEhlaWdodDtcbiAgICAgIH1cblxuICAgICAgaWYgKGF4aXMgPT09ICdYJykge1xuICAgICAgICByZXR1cm4gZWwuY2xpZW50V2lkdGggKyBST1VORElOR19UT0xFUkFOQ0UgPCBlbC5zY3JvbGxXaWR0aDtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBpbmRpY2F0ZXMgaWYgYW4gZWxlbWVudCBoYXMgYSBzY3JvbGxhYmxlIG92ZXJmbG93IHByb3BlcnR5IGluIHRoZSBheGlzXG4gICAgICogQG1ldGhvZCBjYW5PdmVyZmxvd1xuICAgICAqIEBwYXJhbSB7Tm9kZX0gZWxcbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gYXhpc1xuICAgICAqIEByZXR1cm5zIHtCb29sZWFufVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGNhbk92ZXJmbG93KGVsLCBheGlzKSB7XG4gICAgICB2YXIgb3ZlcmZsb3dWYWx1ZSA9IHcuZ2V0Q29tcHV0ZWRTdHlsZShlbCwgbnVsbClbJ292ZXJmbG93JyArIGF4aXNdO1xuXG4gICAgICByZXR1cm4gb3ZlcmZsb3dWYWx1ZSA9PT0gJ2F1dG8nIHx8IG92ZXJmbG93VmFsdWUgPT09ICdzY3JvbGwnO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIGluZGljYXRlcyBpZiBhbiBlbGVtZW50IGNhbiBiZSBzY3JvbGxlZCBpbiBlaXRoZXIgYXhpc1xuICAgICAqIEBtZXRob2QgaXNTY3JvbGxhYmxlXG4gICAgICogQHBhcmFtIHtOb2RlfSBlbFxuICAgICAqIEBwYXJhbSB7U3RyaW5nfSBheGlzXG4gICAgICogQHJldHVybnMge0Jvb2xlYW59XG4gICAgICovXG4gICAgZnVuY3Rpb24gaXNTY3JvbGxhYmxlKGVsKSB7XG4gICAgICB2YXIgaXNTY3JvbGxhYmxlWSA9IGhhc1Njcm9sbGFibGVTcGFjZShlbCwgJ1knKSAmJiBjYW5PdmVyZmxvdyhlbCwgJ1knKTtcbiAgICAgIHZhciBpc1Njcm9sbGFibGVYID0gaGFzU2Nyb2xsYWJsZVNwYWNlKGVsLCAnWCcpICYmIGNhbk92ZXJmbG93KGVsLCAnWCcpO1xuXG4gICAgICByZXR1cm4gaXNTY3JvbGxhYmxlWSB8fCBpc1Njcm9sbGFibGVYO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIGZpbmRzIHNjcm9sbGFibGUgcGFyZW50IG9mIGFuIGVsZW1lbnRcbiAgICAgKiBAbWV0aG9kIGZpbmRTY3JvbGxhYmxlUGFyZW50XG4gICAgICogQHBhcmFtIHtOb2RlfSBlbFxuICAgICAqIEByZXR1cm5zIHtOb2RlfSBlbFxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGZpbmRTY3JvbGxhYmxlUGFyZW50KGVsKSB7XG4gICAgICB2YXIgaXNCb2R5O1xuXG4gICAgICBkbyB7XG4gICAgICAgIGVsID0gZWwucGFyZW50Tm9kZTtcblxuICAgICAgICBpc0JvZHkgPSBlbCA9PT0gZC5ib2R5O1xuICAgICAgfSB3aGlsZSAoaXNCb2R5ID09PSBmYWxzZSAmJiBpc1Njcm9sbGFibGUoZWwpID09PSBmYWxzZSk7XG5cbiAgICAgIGlzQm9keSA9IG51bGw7XG5cbiAgICAgIHJldHVybiBlbDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBzZWxmIGludm9rZWQgZnVuY3Rpb24gdGhhdCwgZ2l2ZW4gYSBjb250ZXh0LCBzdGVwcyB0aHJvdWdoIHNjcm9sbGluZ1xuICAgICAqIEBtZXRob2Qgc3RlcFxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBjb250ZXh0XG4gICAgICogQHJldHVybnMge3VuZGVmaW5lZH1cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBzdGVwKGNvbnRleHQpIHtcbiAgICAgIHZhciB0aW1lID0gbm93KCk7XG4gICAgICB2YXIgdmFsdWU7XG4gICAgICB2YXIgY3VycmVudFg7XG4gICAgICB2YXIgY3VycmVudFk7XG4gICAgICB2YXIgZWxhcHNlZCA9ICh0aW1lIC0gY29udGV4dC5zdGFydFRpbWUpIC8gU0NST0xMX1RJTUU7XG5cbiAgICAgIC8vIGF2b2lkIGVsYXBzZWQgdGltZXMgaGlnaGVyIHRoYW4gb25lXG4gICAgICBlbGFwc2VkID0gZWxhcHNlZCA+IDEgPyAxIDogZWxhcHNlZDtcblxuICAgICAgLy8gYXBwbHkgZWFzaW5nIHRvIGVsYXBzZWQgdGltZVxuICAgICAgdmFsdWUgPSBlYXNlKGVsYXBzZWQpO1xuXG4gICAgICBjdXJyZW50WCA9IGNvbnRleHQuc3RhcnRYICsgKGNvbnRleHQueCAtIGNvbnRleHQuc3RhcnRYKSAqIHZhbHVlO1xuICAgICAgY3VycmVudFkgPSBjb250ZXh0LnN0YXJ0WSArIChjb250ZXh0LnkgLSBjb250ZXh0LnN0YXJ0WSkgKiB2YWx1ZTtcblxuICAgICAgY29udGV4dC5tZXRob2QuY2FsbChjb250ZXh0LnNjcm9sbGFibGUsIGN1cnJlbnRYLCBjdXJyZW50WSk7XG5cbiAgICAgIC8vIHNjcm9sbCBtb3JlIGlmIHdlIGhhdmUgbm90IHJlYWNoZWQgb3VyIGRlc3RpbmF0aW9uXG4gICAgICBpZiAoY3VycmVudFggIT09IGNvbnRleHQueCB8fCBjdXJyZW50WSAhPT0gY29udGV4dC55KSB7XG4gICAgICAgIHcucmVxdWVzdEFuaW1hdGlvbkZyYW1lKHN0ZXAuYmluZCh3LCBjb250ZXh0KSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogc2Nyb2xscyB3aW5kb3cgb3IgZWxlbWVudCB3aXRoIGEgc21vb3RoIGJlaGF2aW9yXG4gICAgICogQG1ldGhvZCBzbW9vdGhTY3JvbGxcbiAgICAgKiBAcGFyYW0ge09iamVjdHxOb2RlfSBlbFxuICAgICAqIEBwYXJhbSB7TnVtYmVyfSB4XG4gICAgICogQHBhcmFtIHtOdW1iZXJ9IHlcbiAgICAgKiBAcmV0dXJucyB7dW5kZWZpbmVkfVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIHNtb290aFNjcm9sbChlbCwgeCwgeSkge1xuICAgICAgdmFyIHNjcm9sbGFibGU7XG4gICAgICB2YXIgc3RhcnRYO1xuICAgICAgdmFyIHN0YXJ0WTtcbiAgICAgIHZhciBtZXRob2Q7XG4gICAgICB2YXIgc3RhcnRUaW1lID0gbm93KCk7XG5cbiAgICAgIC8vIGRlZmluZSBzY3JvbGwgY29udGV4dFxuICAgICAgaWYgKGVsID09PSBkLmJvZHkpIHtcbiAgICAgICAgc2Nyb2xsYWJsZSA9IHc7XG4gICAgICAgIHN0YXJ0WCA9IHcuc2Nyb2xsWCB8fCB3LnBhZ2VYT2Zmc2V0O1xuICAgICAgICBzdGFydFkgPSB3LnNjcm9sbFkgfHwgdy5wYWdlWU9mZnNldDtcbiAgICAgICAgbWV0aG9kID0gb3JpZ2luYWwuc2Nyb2xsO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgc2Nyb2xsYWJsZSA9IGVsO1xuICAgICAgICBzdGFydFggPSBlbC5zY3JvbGxMZWZ0O1xuICAgICAgICBzdGFydFkgPSBlbC5zY3JvbGxUb3A7XG4gICAgICAgIG1ldGhvZCA9IHNjcm9sbEVsZW1lbnQ7XG4gICAgICB9XG5cbiAgICAgIC8vIHNjcm9sbCBsb29waW5nIG92ZXIgYSBmcmFtZVxuICAgICAgc3RlcCh7XG4gICAgICAgIHNjcm9sbGFibGU6IHNjcm9sbGFibGUsXG4gICAgICAgIG1ldGhvZDogbWV0aG9kLFxuICAgICAgICBzdGFydFRpbWU6IHN0YXJ0VGltZSxcbiAgICAgICAgc3RhcnRYOiBzdGFydFgsXG4gICAgICAgIHN0YXJ0WTogc3RhcnRZLFxuICAgICAgICB4OiB4LFxuICAgICAgICB5OiB5XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICAvLyBPUklHSU5BTCBNRVRIT0RTIE9WRVJSSURFU1xuICAgIC8vIHcuc2Nyb2xsIGFuZCB3LnNjcm9sbFRvXG4gICAgdy5zY3JvbGwgPSB3LnNjcm9sbFRvID0gZnVuY3Rpb24oKSB7XG4gICAgICAvLyBhdm9pZCBhY3Rpb24gd2hlbiBubyBhcmd1bWVudHMgYXJlIHBhc3NlZFxuICAgICAgaWYgKGFyZ3VtZW50c1swXSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgLy8gYXZvaWQgc21vb3RoIGJlaGF2aW9yIGlmIG5vdCByZXF1aXJlZFxuICAgICAgaWYgKHNob3VsZEJhaWxPdXQoYXJndW1lbnRzWzBdKSA9PT0gdHJ1ZSkge1xuICAgICAgICBvcmlnaW5hbC5zY3JvbGwuY2FsbChcbiAgICAgICAgICB3LFxuICAgICAgICAgIGFyZ3VtZW50c1swXS5sZWZ0ICE9PSB1bmRlZmluZWRcbiAgICAgICAgICAgID8gYXJndW1lbnRzWzBdLmxlZnRcbiAgICAgICAgICAgIDogdHlwZW9mIGFyZ3VtZW50c1swXSAhPT0gJ29iamVjdCdcbiAgICAgICAgICAgICAgPyBhcmd1bWVudHNbMF1cbiAgICAgICAgICAgICAgOiB3LnNjcm9sbFggfHwgdy5wYWdlWE9mZnNldCxcbiAgICAgICAgICAvLyB1c2UgdG9wIHByb3AsIHNlY29uZCBhcmd1bWVudCBpZiBwcmVzZW50IG9yIGZhbGxiYWNrIHRvIHNjcm9sbFlcbiAgICAgICAgICBhcmd1bWVudHNbMF0udG9wICE9PSB1bmRlZmluZWRcbiAgICAgICAgICAgID8gYXJndW1lbnRzWzBdLnRvcFxuICAgICAgICAgICAgOiBhcmd1bWVudHNbMV0gIT09IHVuZGVmaW5lZFxuICAgICAgICAgICAgICA/IGFyZ3VtZW50c1sxXVxuICAgICAgICAgICAgICA6IHcuc2Nyb2xsWSB8fCB3LnBhZ2VZT2Zmc2V0XG4gICAgICAgICk7XG5cbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICAvLyBMRVQgVEhFIFNNT09USE5FU1MgQkVHSU4hXG4gICAgICBzbW9vdGhTY3JvbGwuY2FsbChcbiAgICAgICAgdyxcbiAgICAgICAgZC5ib2R5LFxuICAgICAgICBhcmd1bWVudHNbMF0ubGVmdCAhPT0gdW5kZWZpbmVkXG4gICAgICAgICAgPyB+fmFyZ3VtZW50c1swXS5sZWZ0XG4gICAgICAgICAgOiB3LnNjcm9sbFggfHwgdy5wYWdlWE9mZnNldCxcbiAgICAgICAgYXJndW1lbnRzWzBdLnRvcCAhPT0gdW5kZWZpbmVkXG4gICAgICAgICAgPyB+fmFyZ3VtZW50c1swXS50b3BcbiAgICAgICAgICA6IHcuc2Nyb2xsWSB8fCB3LnBhZ2VZT2Zmc2V0XG4gICAgICApO1xuICAgIH07XG5cbiAgICAvLyB3LnNjcm9sbEJ5XG4gICAgdy5zY3JvbGxCeSA9IGZ1bmN0aW9uKCkge1xuICAgICAgLy8gYXZvaWQgYWN0aW9uIHdoZW4gbm8gYXJndW1lbnRzIGFyZSBwYXNzZWRcbiAgICAgIGlmIChhcmd1bWVudHNbMF0gPT09IHVuZGVmaW5lZCkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIC8vIGF2b2lkIHNtb290aCBiZWhhdmlvciBpZiBub3QgcmVxdWlyZWRcbiAgICAgIGlmIChzaG91bGRCYWlsT3V0KGFyZ3VtZW50c1swXSkpIHtcbiAgICAgICAgb3JpZ2luYWwuc2Nyb2xsQnkuY2FsbChcbiAgICAgICAgICB3LFxuICAgICAgICAgIGFyZ3VtZW50c1swXS5sZWZ0ICE9PSB1bmRlZmluZWRcbiAgICAgICAgICAgID8gYXJndW1lbnRzWzBdLmxlZnRcbiAgICAgICAgICAgIDogdHlwZW9mIGFyZ3VtZW50c1swXSAhPT0gJ29iamVjdCcgPyBhcmd1bWVudHNbMF0gOiAwLFxuICAgICAgICAgIGFyZ3VtZW50c1swXS50b3AgIT09IHVuZGVmaW5lZFxuICAgICAgICAgICAgPyBhcmd1bWVudHNbMF0udG9wXG4gICAgICAgICAgICA6IGFyZ3VtZW50c1sxXSAhPT0gdW5kZWZpbmVkID8gYXJndW1lbnRzWzFdIDogMFxuICAgICAgICApO1xuXG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgLy8gTEVUIFRIRSBTTU9PVEhORVNTIEJFR0lOIVxuICAgICAgc21vb3RoU2Nyb2xsLmNhbGwoXG4gICAgICAgIHcsXG4gICAgICAgIGQuYm9keSxcbiAgICAgICAgfn5hcmd1bWVudHNbMF0ubGVmdCArICh3LnNjcm9sbFggfHwgdy5wYWdlWE9mZnNldCksXG4gICAgICAgIH5+YXJndW1lbnRzWzBdLnRvcCArICh3LnNjcm9sbFkgfHwgdy5wYWdlWU9mZnNldClcbiAgICAgICk7XG4gICAgfTtcblxuICAgIC8vIEVsZW1lbnQucHJvdG90eXBlLnNjcm9sbCBhbmQgRWxlbWVudC5wcm90b3R5cGUuc2Nyb2xsVG9cbiAgICBFbGVtZW50LnByb3RvdHlwZS5zY3JvbGwgPSBFbGVtZW50LnByb3RvdHlwZS5zY3JvbGxUbyA9IGZ1bmN0aW9uKCkge1xuICAgICAgLy8gYXZvaWQgYWN0aW9uIHdoZW4gbm8gYXJndW1lbnRzIGFyZSBwYXNzZWRcbiAgICAgIGlmIChhcmd1bWVudHNbMF0gPT09IHVuZGVmaW5lZCkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIC8vIGF2b2lkIHNtb290aCBiZWhhdmlvciBpZiBub3QgcmVxdWlyZWRcbiAgICAgIGlmIChzaG91bGRCYWlsT3V0KGFyZ3VtZW50c1swXSkgPT09IHRydWUpIHtcbiAgICAgICAgLy8gaWYgb25lIG51bWJlciBpcyBwYXNzZWQsIHRocm93IGVycm9yIHRvIG1hdGNoIEZpcmVmb3ggaW1wbGVtZW50YXRpb25cbiAgICAgICAgaWYgKHR5cGVvZiBhcmd1bWVudHNbMF0gPT09ICdudW1iZXInICYmIGFyZ3VtZW50c1sxXSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IFN5bnRheEVycm9yKCdWYWx1ZSBjb3VsZCBub3QgYmUgY29udmVydGVkJyk7XG4gICAgICAgIH1cblxuICAgICAgICBvcmlnaW5hbC5lbGVtZW50U2Nyb2xsLmNhbGwoXG4gICAgICAgICAgdGhpcyxcbiAgICAgICAgICAvLyB1c2UgbGVmdCBwcm9wLCBmaXJzdCBudW1iZXIgYXJndW1lbnQgb3IgZmFsbGJhY2sgdG8gc2Nyb2xsTGVmdFxuICAgICAgICAgIGFyZ3VtZW50c1swXS5sZWZ0ICE9PSB1bmRlZmluZWRcbiAgICAgICAgICAgID8gfn5hcmd1bWVudHNbMF0ubGVmdFxuICAgICAgICAgICAgOiB0eXBlb2YgYXJndW1lbnRzWzBdICE9PSAnb2JqZWN0JyA/IH5+YXJndW1lbnRzWzBdIDogdGhpcy5zY3JvbGxMZWZ0LFxuICAgICAgICAgIC8vIHVzZSB0b3AgcHJvcCwgc2Vjb25kIGFyZ3VtZW50IG9yIGZhbGxiYWNrIHRvIHNjcm9sbFRvcFxuICAgICAgICAgIGFyZ3VtZW50c1swXS50b3AgIT09IHVuZGVmaW5lZFxuICAgICAgICAgICAgPyB+fmFyZ3VtZW50c1swXS50b3BcbiAgICAgICAgICAgIDogYXJndW1lbnRzWzFdICE9PSB1bmRlZmluZWQgPyB+fmFyZ3VtZW50c1sxXSA6IHRoaXMuc2Nyb2xsVG9wXG4gICAgICAgICk7XG5cbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICB2YXIgbGVmdCA9IGFyZ3VtZW50c1swXS5sZWZ0O1xuICAgICAgdmFyIHRvcCA9IGFyZ3VtZW50c1swXS50b3A7XG5cbiAgICAgIC8vIExFVCBUSEUgU01PT1RITkVTUyBCRUdJTiFcbiAgICAgIHNtb290aFNjcm9sbC5jYWxsKFxuICAgICAgICB0aGlzLFxuICAgICAgICB0aGlzLFxuICAgICAgICB0eXBlb2YgbGVmdCA9PT0gJ3VuZGVmaW5lZCcgPyB0aGlzLnNjcm9sbExlZnQgOiB+fmxlZnQsXG4gICAgICAgIHR5cGVvZiB0b3AgPT09ICd1bmRlZmluZWQnID8gdGhpcy5zY3JvbGxUb3AgOiB+fnRvcFxuICAgICAgKTtcbiAgICB9O1xuXG4gICAgLy8gRWxlbWVudC5wcm90b3R5cGUuc2Nyb2xsQnlcbiAgICBFbGVtZW50LnByb3RvdHlwZS5zY3JvbGxCeSA9IGZ1bmN0aW9uKCkge1xuICAgICAgLy8gYXZvaWQgYWN0aW9uIHdoZW4gbm8gYXJndW1lbnRzIGFyZSBwYXNzZWRcbiAgICAgIGlmIChhcmd1bWVudHNbMF0gPT09IHVuZGVmaW5lZCkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIC8vIGF2b2lkIHNtb290aCBiZWhhdmlvciBpZiBub3QgcmVxdWlyZWRcbiAgICAgIGlmIChzaG91bGRCYWlsT3V0KGFyZ3VtZW50c1swXSkgPT09IHRydWUpIHtcbiAgICAgICAgb3JpZ2luYWwuZWxlbWVudFNjcm9sbC5jYWxsKFxuICAgICAgICAgIHRoaXMsXG4gICAgICAgICAgYXJndW1lbnRzWzBdLmxlZnQgIT09IHVuZGVmaW5lZFxuICAgICAgICAgICAgPyB+fmFyZ3VtZW50c1swXS5sZWZ0ICsgdGhpcy5zY3JvbGxMZWZ0XG4gICAgICAgICAgICA6IH5+YXJndW1lbnRzWzBdICsgdGhpcy5zY3JvbGxMZWZ0LFxuICAgICAgICAgIGFyZ3VtZW50c1swXS50b3AgIT09IHVuZGVmaW5lZFxuICAgICAgICAgICAgPyB+fmFyZ3VtZW50c1swXS50b3AgKyB0aGlzLnNjcm9sbFRvcFxuICAgICAgICAgICAgOiB+fmFyZ3VtZW50c1sxXSArIHRoaXMuc2Nyb2xsVG9wXG4gICAgICAgICk7XG5cbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICB0aGlzLnNjcm9sbCh7XG4gICAgICAgIGxlZnQ6IH5+YXJndW1lbnRzWzBdLmxlZnQgKyB0aGlzLnNjcm9sbExlZnQsXG4gICAgICAgIHRvcDogfn5hcmd1bWVudHNbMF0udG9wICsgdGhpcy5zY3JvbGxUb3AsXG4gICAgICAgIGJlaGF2aW9yOiBhcmd1bWVudHNbMF0uYmVoYXZpb3JcbiAgICAgIH0pO1xuICAgIH07XG5cbiAgICAvLyBFbGVtZW50LnByb3RvdHlwZS5zY3JvbGxJbnRvVmlld1xuICAgIEVsZW1lbnQucHJvdG90eXBlLnNjcm9sbEludG9WaWV3ID0gZnVuY3Rpb24oKSB7XG4gICAgICAvLyBhdm9pZCBzbW9vdGggYmVoYXZpb3IgaWYgbm90IHJlcXVpcmVkXG4gICAgICBpZiAoc2hvdWxkQmFpbE91dChhcmd1bWVudHNbMF0pID09PSB0cnVlKSB7XG4gICAgICAgIG9yaWdpbmFsLnNjcm9sbEludG9WaWV3LmNhbGwoXG4gICAgICAgICAgdGhpcyxcbiAgICAgICAgICBhcmd1bWVudHNbMF0gPT09IHVuZGVmaW5lZCA/IHRydWUgOiBhcmd1bWVudHNbMF1cbiAgICAgICAgKTtcblxuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIC8vIExFVCBUSEUgU01PT1RITkVTUyBCRUdJTiFcbiAgICAgIHZhciBzY3JvbGxhYmxlUGFyZW50ID0gZmluZFNjcm9sbGFibGVQYXJlbnQodGhpcyk7XG4gICAgICB2YXIgcGFyZW50UmVjdHMgPSBzY3JvbGxhYmxlUGFyZW50LmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xuICAgICAgdmFyIGNsaWVudFJlY3RzID0gdGhpcy5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcblxuICAgICAgaWYgKHNjcm9sbGFibGVQYXJlbnQgIT09IGQuYm9keSkge1xuICAgICAgICAvLyByZXZlYWwgZWxlbWVudCBpbnNpZGUgcGFyZW50XG4gICAgICAgIHNtb290aFNjcm9sbC5jYWxsKFxuICAgICAgICAgIHRoaXMsXG4gICAgICAgICAgc2Nyb2xsYWJsZVBhcmVudCxcbiAgICAgICAgICBzY3JvbGxhYmxlUGFyZW50LnNjcm9sbExlZnQgKyBjbGllbnRSZWN0cy5sZWZ0IC0gcGFyZW50UmVjdHMubGVmdCxcbiAgICAgICAgICBzY3JvbGxhYmxlUGFyZW50LnNjcm9sbFRvcCArIGNsaWVudFJlY3RzLnRvcCAtIHBhcmVudFJlY3RzLnRvcFxuICAgICAgICApO1xuXG4gICAgICAgIC8vIHJldmVhbCBwYXJlbnQgaW4gdmlld3BvcnQgdW5sZXNzIGlzIGZpeGVkXG4gICAgICAgIGlmICh3LmdldENvbXB1dGVkU3R5bGUoc2Nyb2xsYWJsZVBhcmVudCkucG9zaXRpb24gIT09ICdmaXhlZCcpIHtcbiAgICAgICAgICB3LnNjcm9sbEJ5KHtcbiAgICAgICAgICAgIGxlZnQ6IHBhcmVudFJlY3RzLmxlZnQsXG4gICAgICAgICAgICB0b3A6IHBhcmVudFJlY3RzLnRvcCxcbiAgICAgICAgICAgIGJlaGF2aW9yOiAnc21vb3RoJ1xuICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyByZXZlYWwgZWxlbWVudCBpbiB2aWV3cG9ydFxuICAgICAgICB3LnNjcm9sbEJ5KHtcbiAgICAgICAgICBsZWZ0OiBjbGllbnRSZWN0cy5sZWZ0LFxuICAgICAgICAgIHRvcDogY2xpZW50UmVjdHMudG9wLFxuICAgICAgICAgIGJlaGF2aW9yOiAnc21vb3RoJ1xuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9O1xuICB9XG5cbiAgaWYgKHR5cGVvZiBleHBvcnRzID09PSAnb2JqZWN0JyAmJiB0eXBlb2YgbW9kdWxlICE9PSAndW5kZWZpbmVkJykge1xuICAgIC8vIGNvbW1vbmpzXG4gICAgbW9kdWxlLmV4cG9ydHMgPSB7IHBvbHlmaWxsOiBwb2x5ZmlsbCB9O1xuICB9IGVsc2Uge1xuICAgIC8vIGdsb2JhbFxuICAgIHBvbHlmaWxsKCk7XG4gIH1cblxufSgpKTtcbiIsImNvbnN0IGFydGljbGVUZW1wbGF0ZSA9IGBcblx0PGFydGljbGUgY2xhc3M9XCJhcnRpY2xlX19vdXRlclwiPlxuXHRcdDxkaXYgY2xhc3M9XCJhcnRpY2xlX19pbm5lclwiPlxuXHRcdFx0PGRpdiBjbGFzcz1cImFydGljbGVfX2hlYWRpbmdcIj5cblx0XHRcdFx0PGEgY2xhc3M9XCJqcy1lbnRyeS10aXRsZVwiPjwvYT5cblx0XHRcdFx0PGgyIGNsYXNzPVwiYXJ0aWNsZS1oZWFkaW5nX190aXRsZVwiPjwvaDI+XG5cdFx0XHRcdDxkaXYgY2xhc3M9XCJhcnRpY2xlLWhlYWRpbmdfX25hbWVcIj5cblx0XHRcdFx0XHQ8c3BhbiBjbGFzcz1cImFydGljbGUtaGVhZGluZ19fbmFtZS0tZmlyc3RcIj48L3NwYW4+XG5cdFx0XHRcdFx0PGEgY2xhc3M9XCJqcy1lbnRyeS1hcnRpc3RcIj48L2E+XG5cdFx0XHRcdFx0PHNwYW4gY2xhc3M9XCJhcnRpY2xlLWhlYWRpbmdfX25hbWUtLWxhc3RcIj48L3NwYW4+XG5cdFx0XHRcdDwvZGl2PlxuXHRcdFx0PC9kaXY+XHRcblx0XHRcdDxkaXYgY2xhc3M9XCJhcnRpY2xlX19zbGlkZXItb3V0ZXJcIj5cblx0XHRcdFx0PGRpdiBjbGFzcz1cImFydGljbGVfX3NsaWRlci1pbm5lclwiPjwvZGl2PlxuXHRcdFx0XHQ8ZGl2IGNsYXNzPVwiYXJ0aWNsZV9fc2Nyb2xsLWNvbnRyb2xzXCI+XG5cdFx0XHRcdFx0PHNwYW4gY2xhc3M9XCJjb250cm9scyBhcnJvdy1wcmV2XCI+4oaQPC9zcGFuPiBcblx0XHRcdFx0XHQ8c3BhbiBjbGFzcz1cImNvbnRyb2xzIGFycm93LW5leHRcIj7ihpI8L3NwYW4+XG5cdFx0XHRcdDwvZGl2PlxuXHRcdFx0XHQ8cCBjbGFzcz1cImpzLWFydGljbGUtYW5jaG9yLXRhcmdldFwiPjwvcD5cblx0XHQ8L2Rpdj5cblx0PC9hcnRpY2xlPlxuYDtcblxuZXhwb3J0IGRlZmF1bHQgYXJ0aWNsZVRlbXBsYXRlOyIsImltcG9ydCBzbW9vdGhzY3JvbGwgZnJvbSAnc21vb3Roc2Nyb2xsLXBvbHlmaWxsJztcblxuaW1wb3J0IG5hdkxnIGZyb20gJy4vbmF2LWxnJztcbmltcG9ydCBhcnRpY2xlVGVtcGxhdGUgZnJvbSAnLi9hcnRpY2xlLXRlbXBsYXRlJztcblxuXG5jb25zdCBEQiA9ICdodHRwczovL25leHVzLWNhdGFsb2cuZmlyZWJhc2Vpby5jb20vcG9zdHMuanNvbj9hdXRoPTdnN3B5S0t5a04zTjVld3JJbWhPYVM2dndyRnNjNWZLa3JrOGVqemYnO1xuY29uc3QgYWxwaGFiZXQgPSBbJ2EnLCAnYicsICdjJywgJ2QnLCAnZScsICdmJywgJ2cnLCAnaCcsICdpJywgJ2onLCAnaycsICdsJywgJ20nLCAnbicsICdvJywgJ3AnLCAncicsICdzJywgJ3QnLCAndScsICd2JywgJ3cnLCAneScsICd6J107XG5cbmNvbnN0ICRsb2FkaW5nID0gQXJyYXkuZnJvbShkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKCcubG9hZGluZycpKTtcbmNvbnN0ICRuYXYgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnanMtbmF2Jyk7XG5jb25zdCAkcGFyYWxsYXggPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcucGFyYWxsYXgnKTtcbmNvbnN0ICRjb250ZW50ID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignLmNvbnRlbnQnKTtcbmNvbnN0ICR0aXRsZSA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdqcy10aXRsZScpO1xuY29uc3QgJGFycm93ID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignLmFycm93Jyk7XG5jb25zdCAkbW9kYWwgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcubW9kYWwnKTtcbmNvbnN0ICRsaWdodGJveCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJy5saWdodGJveCcpO1xuY29uc3QgJHZpZXcgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcubGlnaHRib3gtdmlldycpO1xuXG5sZXQgc29ydEtleSA9IDA7IC8vIDAgPSBhcnRpc3QsIDEgPSB0aXRsZVxubGV0IGVudHJpZXMgPSB7IGJ5QXV0aG9yOiBbXSwgYnlUaXRsZTogW10gfTtcbmxldCBjdXJyZW50TGV0dGVyID0gJ0EnO1xuXG5sZXQgbGlnaHRib3ggPSBmYWxzZTtcbmxldCB4MiA9IGZhbHNlO1xuY29uc3QgYXR0YWNoSW1hZ2VMaXN0ZW5lcnMgPSAoKSA9PiB7XG5cdGxldCAkaW1hZ2VzID0gQXJyYXkuZnJvbShkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKCcuYXJ0aWNsZS1pbWFnZScpKTtcblxuXHQkaW1hZ2VzLmZvckVhY2goaW1nID0+IHtcblx0XHRpbWcuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoZXZ0KSA9PiB7XG5cdFx0XHRpZiAoIWxpZ2h0Ym94KSB7XG5cdFx0XHRcdGxldCBzcmMgPSBpbWcuc3JjO1xuXHRcdFx0XHQvLyBsZXQgdHlwZSA9IGltZy53aWR0aCA+PSBpbWcuaGVpZ2h0ID8gJ2wnIDogJ3AnO1xuXHRcdFx0XHRcblx0XHRcdFx0JGxpZ2h0Ym94LmNsYXNzTGlzdC5hZGQoJ3Nob3ctaW1nJyk7XG5cdFx0XHRcdCR2aWV3LnNldEF0dHJpYnV0ZSgnc3R5bGUnLCBgYmFja2dyb3VuZC1pbWFnZTogdXJsKCR7c3JjfSlgKTtcblx0XHRcdFx0bGlnaHRib3ggPSB0cnVlO1xuXHRcdFx0fVxuXHRcdH0pO1xuXHR9KTtcblxuXHQkdmlldy5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsICgpID0+IHtcblx0XHRpZiAobGlnaHRib3gpIHtcblx0XHRcdCRsaWdodGJveC5jbGFzc0xpc3QucmVtb3ZlKCdzaG93LWltZycpO1xuXHRcdFx0JGxpZ2h0Ym94LmZpcnN0RWxlbWVudENoaWxkLmNsYXNzTGlzdC5yZW1vdmUoJ3ZpZXcteDInKTtcblx0XHRcdGxpZ2h0Ym94ID0gZmFsc2U7XG5cdFx0fVxuXHR9KTtcbn07XG5cbmxldCBtb2RhbCA9IGZhbHNlO1xuY29uc3QgYXR0YWNoTW9kYWxMaXN0ZW5lcnMgPSAoKSA9PiB7XG5cdGNvbnN0ICRmaW5kID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2pzLWZpbmQnKTtcblx0XG5cdCRmaW5kLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKCkgPT4ge1xuXHRcdCRtb2RhbC5jbGFzc0xpc3QuYWRkKCdzaG93Jyk7XG5cdFx0bW9kYWwgPSB0cnVlO1xuXHR9KTtcblxuXHQkbW9kYWwuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoKSA9PiB7XG5cdFx0JG1vZGFsLmNsYXNzTGlzdC5yZW1vdmUoJ3Nob3cnKTtcblx0XHRtb2RhbCA9IGZhbHNlO1xuXHR9KTtcblxuXHR3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcigna2V5ZG93bicsICgpID0+IHtcblx0XHRpZiAobW9kYWwpIHtcblx0XHRcdHNldFRpbWVvdXQoKCkgPT4ge1xuXHRcdFx0XHQkbW9kYWwuY2xhc3NMaXN0LnJlbW92ZSgnc2hvdycpO1xuXHRcdFx0XHRtb2RhbCA9IGZhbHNlO1xuXHRcdFx0fSwgNjAwKTtcblx0XHR9O1xuXHR9KTtcbn1cblxuY29uc3Qgc2Nyb2xsVG9Ub3AgPSAoKSA9PiB7XG5cdGxldCB0aGluZyA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdhbmNob3ItdGFyZ2V0Jyk7XG5cdHRoaW5nLnNjcm9sbEludG9WaWV3KHtiZWhhdmlvcjogXCJzbW9vdGhcIiwgYmxvY2s6IFwic3RhcnRcIn0pO1xufVxuXG5sZXQgcHJldjtcbmxldCBjdXJyZW50ID0gMDtcbmxldCBpc1Nob3dpbmcgPSBmYWxzZTtcbmNvbnN0IGF0dGFjaEFycm93TGlzdGVuZXJzID0gKCkgPT4ge1xuXHQkYXJyb3cuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoKSA9PiB7XG5cdFx0c2Nyb2xsVG9Ub3AoKTtcblx0fSk7XG5cblx0JHBhcmFsbGF4LmFkZEV2ZW50TGlzdGVuZXIoJ3Njcm9sbCcsICgpID0+IHtcblxuXHRcdGxldCB5ID0gJHRpdGxlLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpLnk7XG5cdFx0aWYgKGN1cnJlbnQgIT09IHkpIHtcblx0XHRcdHByZXYgPSBjdXJyZW50O1xuXHRcdFx0Y3VycmVudCA9IHk7XG5cdFx0fVxuXG5cdFx0aWYgKHkgPD0gLTUwICYmICFpc1Nob3dpbmcpIHtcblx0XHRcdCRhcnJvdy5jbGFzc0xpc3QuYWRkKCdzaG93Jyk7XG5cdFx0XHRpc1Nob3dpbmcgPSB0cnVlO1xuXHRcdH0gZWxzZSBpZiAoeSA+IC01MCAmJiBpc1Nob3dpbmcpIHtcblx0XHRcdCRhcnJvdy5jbGFzc0xpc3QucmVtb3ZlKCdzaG93Jyk7XG5cdFx0XHRpc1Nob3dpbmcgPSBmYWxzZTtcblx0XHR9XG5cdH0pO1xufTtcblxuY29uc3QgYWRkU29ydEJ1dHRvbkxpc3RlbmVycyA9ICgpID0+IHtcblx0bGV0ICRieUFydGlzdCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdqcy1ieS1hcnRpc3QnKTtcblx0bGV0ICRieVRpdGxlID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2pzLWJ5LXRpdGxlJyk7XG5cdCRieUFydGlzdC5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsICgpID0+IHtcblx0XHRpZiAoc29ydEtleSkge1xuXHRcdFx0c2Nyb2xsVG9Ub3AoKTtcblx0XHRcdHNvcnRLZXkgPSAwO1xuXHRcdFx0JGJ5QXJ0aXN0LmNsYXNzTGlzdC5hZGQoJ2FjdGl2ZScpO1xuXHRcdFx0JGJ5VGl0bGUuY2xhc3NMaXN0LnJlbW92ZSgnYWN0aXZlJyk7XG5cblx0XHRcdHJlbmRlckVudHJpZXMoKTtcblx0XHR9XG5cdH0pO1xuXG5cdCRieVRpdGxlLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKCkgPT4ge1xuXHRcdGlmICghc29ydEtleSkge1xuXHRcdFx0c2Nyb2xsVG9Ub3AoKTtcblx0XHRcdHNvcnRLZXkgPSAxO1xuXHRcdFx0JGJ5VGl0bGUuY2xhc3NMaXN0LmFkZCgnYWN0aXZlJyk7XG5cdFx0XHQkYnlBcnRpc3QuY2xhc3NMaXN0LnJlbW92ZSgnYWN0aXZlJyk7XG5cblx0XHRcdHJlbmRlckVudHJpZXMoKTtcblx0XHR9XG5cdH0pO1xufTtcblxuY29uc3QgY2xlYXJBbmNob3JzID0gKHByZXZTZWxlY3RvcikgPT4ge1xuXHRsZXQgJGVudHJpZXMgPSBBcnJheS5mcm9tKGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwocHJldlNlbGVjdG9yKSk7XG5cdCRlbnRyaWVzLmZvckVhY2goZW50cnkgPT4gZW50cnkucmVtb3ZlQXR0cmlidXRlKCduYW1lJykpO1xufTtcblxuY29uc3QgZmluZEZpcnN0RW50cnkgPSAoY2hhcikgPT4ge1xuXHRsZXQgc2VsZWN0b3IgPSBzb3J0S2V5ID8gJy5qcy1lbnRyeS10aXRsZScgOiAnLmpzLWVudHJ5LWFydGlzdCc7XG5cdGxldCBwcmV2U2VsZWN0b3IgPSAhc29ydEtleSA/ICcuanMtZW50cnktdGl0bGUnIDogJy5qcy1lbnRyeS1hcnRpc3QnO1xuXHRsZXQgJGVudHJpZXMgPSBBcnJheS5mcm9tKGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoc2VsZWN0b3IpKTtcblxuXHRjbGVhckFuY2hvcnMocHJldlNlbGVjdG9yKTtcblxuXHRyZXR1cm4gJGVudHJpZXMuZmluZChlbnRyeSA9PiB7XG5cdFx0bGV0IG5vZGUgPSBlbnRyeS5uZXh0RWxlbWVudFNpYmxpbmc7XG5cdFx0cmV0dXJuIG5vZGUuaW5uZXJIVE1MWzBdID09PSBjaGFyIHx8IG5vZGUuaW5uZXJIVE1MWzBdID09PSBjaGFyLnRvVXBwZXJDYXNlKCk7XG5cdH0pO1xufTtcblxuXG5jb25zdCBtYWtlQWxwaGFiZXQgPSAoKSA9PiB7XG5cdGNvbnN0IGF0dGFjaEFuY2hvckxpc3RlbmVyID0gKCRhbmNob3IsIGxldHRlcikgPT4ge1xuXHRcdCRhbmNob3IuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoKSA9PiB7XG5cdFx0XHRjb25zdCBsZXR0ZXJOb2RlID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQobGV0dGVyKTtcblx0XHRcdGxldCB0YXJnZXQ7XG5cblx0XHRcdGlmICghc29ydEtleSkge1xuXHRcdFx0XHR0YXJnZXQgPSBsZXR0ZXIgPT09ICdhJyA/IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdhbmNob3ItdGFyZ2V0JykgOiBsZXR0ZXJOb2RlLnBhcmVudEVsZW1lbnQucGFyZW50RWxlbWVudC5wYXJlbnRFbGVtZW50LnBhcmVudEVsZW1lbnQucHJldmlvdXNFbGVtZW50U2libGluZy5xdWVyeVNlbGVjdG9yKCcuanMtYXJ0aWNsZS1hbmNob3ItdGFyZ2V0Jyk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHR0YXJnZXQgPSBsZXR0ZXIgPT09ICdhJyA/IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdhbmNob3ItdGFyZ2V0JykgOiBsZXR0ZXJOb2RlLnBhcmVudEVsZW1lbnQucGFyZW50RWxlbWVudC5wYXJlbnRFbGVtZW50LnByZXZpb3VzRWxlbWVudFNpYmxpbmcucXVlcnlTZWxlY3RvcignLmpzLWFydGljbGUtYW5jaG9yLXRhcmdldCcpO1xuXHRcdFx0fTtcblxuXHRcdFx0dGFyZ2V0LnNjcm9sbEludG9WaWV3KHtiZWhhdmlvcjogXCJzbW9vdGhcIiwgYmxvY2s6IFwic3RhcnRcIn0pO1xuXHRcdH0pO1xuXHR9O1xuXG5cdGxldCBhY3RpdmVFbnRyaWVzID0ge307XG5cdGxldCAkb3V0ZXIgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcuYWxwaGFiZXRfX2xldHRlcnMnKTtcblx0JG91dGVyLmlubmVySFRNTCA9ICcnO1xuXG5cdGFscGhhYmV0LmZvckVhY2gobGV0dGVyID0+IHtcblx0XHRsZXQgJGZpcnN0RW50cnkgPSBmaW5kRmlyc3RFbnRyeShsZXR0ZXIpO1xuXHRcdGxldCAkYW5jaG9yID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnYScpO1xuXG5cdFx0aWYgKCEkZmlyc3RFbnRyeSkgcmV0dXJuO1xuXG5cdFx0JGZpcnN0RW50cnkuaWQgPSBsZXR0ZXI7XG5cdFx0JGFuY2hvci5pbm5lckhUTUwgPSBsZXR0ZXIudG9VcHBlckNhc2UoKTtcblx0XHQkYW5jaG9yLmNsYXNzTmFtZSA9ICdhbHBoYWJldF9fbGV0dGVyLWFuY2hvcic7XG5cblx0XHRhdHRhY2hBbmNob3JMaXN0ZW5lcigkYW5jaG9yLCBsZXR0ZXIpO1xuXHRcdCRvdXRlci5hcHBlbmRDaGlsZCgkYW5jaG9yKTtcblx0fSk7XG59O1xuXG5jb25zdCByZW5kZXJJbWFnZXMgPSAoaW1hZ2VzLCAkaW1hZ2VzKSA9PiB7XG5cdGltYWdlcy5mb3JFYWNoKGltYWdlID0+IHtcblx0XHRjb25zdCBzcmMgPSBgLi4vLi4vYXNzZXRzL2ltYWdlcy8ke2ltYWdlfWA7XG5cdFx0Y29uc3QgJGltZ091dGVyID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG5cdFx0Y29uc3QgJGltZyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ0lNRycpO1xuXHRcdCRpbWcuY2xhc3NOYW1lID0gJ2FydGljbGUtaW1hZ2UnO1xuXHRcdCRpbWcuc3JjID0gc3JjO1xuXHRcdCRpbWdPdXRlci5hcHBlbmRDaGlsZCgkaW1nKTtcblx0XHQkaW1hZ2VzLmFwcGVuZENoaWxkKCRpbWdPdXRlcik7XG5cdH0pXG59O1xuXG5jb25zdCByZW5kZXJFbnRyaWVzID0gKCkgPT4ge1xuXHRjb25zdCAkYXJ0aWNsZUxpc3QgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnanMtbGlzdCcpO1xuXHRjb25zdCBlbnRyaWVzTGlzdCA9IHNvcnRLZXkgPyBlbnRyaWVzLmJ5VGl0bGUgOiBlbnRyaWVzLmJ5QXV0aG9yO1xuXG5cdCRhcnRpY2xlTGlzdC5pbm5lckhUTUwgPSAnJztcblxuXHRlbnRyaWVzTGlzdC5mb3JFYWNoKGVudHJ5ID0+IHtcblx0XHRjb25zdCB7IHRpdGxlLCBsYXN0TmFtZSwgZmlyc3ROYW1lLCBpbWFnZXMsIGRlc2NyaXB0aW9uLCBkZXRhaWwgfSA9IGVudHJ5O1xuXG5cdFx0JGFydGljbGVMaXN0Lmluc2VydEFkamFjZW50SFRNTCgnYmVmb3JlZW5kJywgYXJ0aWNsZVRlbXBsYXRlKTtcblxuXHRcdGNvbnN0ICRhbGxTbGlkZXJzID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbCgnLmFydGljbGVfX3NsaWRlci1pbm5lcicpO1xuXHRcdGNvbnN0ICRzbGlkZXIgPSAkYWxsU2xpZGVyc1skYWxsU2xpZGVycy5sZW5ndGggLSAxXTtcblx0XHQvLyBjb25zdCAkaW1hZ2VzID0gJHNsaWRlci5xdWVyeVNlbGVjdG9yKCcuYXJ0aWNsZV9faW1hZ2VzJyk7XG5cblx0XHRpZiAoaW1hZ2VzLmxlbmd0aCkgcmVuZGVySW1hZ2VzKGltYWdlcywgJHNsaWRlcik7XG5cdFx0XG5cdFx0Y29uc3QgJGRlc2NyaXB0aW9uT3V0ZXIgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcblx0XHRjb25zdCAkZGVzY3JpcHRpb25Ob2RlID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgncCcpO1xuXHRcdGNvbnN0ICRkZXRhaWxOb2RlID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgncCcpO1xuXHRcdCRkZXNjcmlwdGlvbk91dGVyLmNsYXNzTGlzdC5hZGQoJ2FydGljbGUtZGVzY3JpcHRpb25fX291dGVyJyk7XG5cdFx0JGRlc2NyaXB0aW9uTm9kZS5jbGFzc0xpc3QuYWRkKCdhcnRpY2xlLWRlc2NyaXB0aW9uJyk7XG5cdFx0JGRldGFpbE5vZGUuY2xhc3NMaXN0LmFkZCgnYXJ0aWNsZS1kZXRhaWwnKTtcblxuXHRcdCRkZXNjcmlwdGlvbk5vZGUuaW5uZXJIVE1MID0gZGVzY3JpcHRpb247XG5cdFx0JGRldGFpbE5vZGUuaW5uZXJIVE1MID0gZGV0YWlsO1xuXG5cdFx0JGRlc2NyaXB0aW9uT3V0ZXIuYXBwZW5kQ2hpbGQoJGRlc2NyaXB0aW9uTm9kZSwgJGRldGFpbE5vZGUpO1xuXHRcdCRzbGlkZXIuYXBwZW5kQ2hpbGQoJGRlc2NyaXB0aW9uT3V0ZXIpO1xuXG5cdFx0Y29uc3QgJHRpdGxlTm9kZXMgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKCcuYXJ0aWNsZS1oZWFkaW5nX190aXRsZScpO1xuXHRcdGNvbnN0ICR0aXRsZSA9ICR0aXRsZU5vZGVzWyR0aXRsZU5vZGVzLmxlbmd0aCAtIDFdO1xuXG5cdFx0Y29uc3QgJGZpcnN0Tm9kZXMgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKCcuYXJ0aWNsZS1oZWFkaW5nX19uYW1lLS1maXJzdCcpO1xuXHRcdGNvbnN0ICRmaXJzdCA9ICRmaXJzdE5vZGVzWyRmaXJzdE5vZGVzLmxlbmd0aCAtIDFdO1xuXG5cdFx0Y29uc3QgJGxhc3ROb2RlcyA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoJy5hcnRpY2xlLWhlYWRpbmdfX25hbWUtLWxhc3QnKTtcblx0XHRjb25zdCAkbGFzdCA9ICRsYXN0Tm9kZXNbJGxhc3ROb2Rlcy5sZW5ndGggLSAxXTtcblxuXHRcdCR0aXRsZS5pbm5lckhUTUwgPSB0aXRsZTtcblx0XHQkZmlyc3QuaW5uZXJIVE1MID0gZmlyc3ROYW1lO1xuXHRcdCRsYXN0LmlubmVySFRNTCA9IGxhc3ROYW1lO1xuXG5cdFx0Y29uc3QgJGFycm93TmV4dCA9ICRzbGlkZXIucGFyZW50RWxlbWVudC5xdWVyeVNlbGVjdG9yKCcuYXJyb3ctbmV4dCcpO1xuXHRcdGNvbnN0ICRhcnJvd1ByZXYgPSAkc2xpZGVyLnBhcmVudEVsZW1lbnQucXVlcnlTZWxlY3RvcignLmFycm93LXByZXYnKTtcblxuXHRcdGxldCBjdXJyZW50ID0gJHNsaWRlci5maXJzdEVsZW1lbnRDaGlsZDtcblx0XHQkYXJyb3dOZXh0LmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKCkgPT4ge1xuXHRcdFx0Y29uc3QgbmV4dCA9IGN1cnJlbnQubmV4dEVsZW1lbnRTaWJsaW5nO1xuXHRcdFx0aWYgKG5leHQpIHtcblx0XHRcdFx0bmV4dC5zY3JvbGxJbnRvVmlldyh7YmVoYXZpb3I6IFwic21vb3RoXCIsIGJsb2NrOiBcIm5lYXJlc3RcIiwgaW5saW5lOiBcImNlbnRlclwifSk7XG5cdFx0XHRcdGN1cnJlbnQgPSBuZXh0O1xuXHRcdFx0fVxuXHRcdH0pO1xuXG5cdFx0JGFycm93UHJldi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsICgpID0+IHtcblx0XHRcdGNvbnN0IHByZXYgPSBjdXJyZW50LnByZXZpb3VzRWxlbWVudFNpYmxpbmc7XG5cdFx0XHRpZiAocHJldikge1xuXHRcdFx0XHRwcmV2LnNjcm9sbEludG9WaWV3KHtiZWhhdmlvcjogXCJzbW9vdGhcIiwgYmxvY2s6IFwibmVhcmVzdFwiLCBpbmxpbmU6IFwiY2VudGVyXCJ9KTtcblx0XHRcdFx0Y3VycmVudCA9IHByZXY7XG5cdFx0XHR9XG5cdFx0fSlcblx0fSk7XG5cblx0YXR0YWNoSW1hZ2VMaXN0ZW5lcnMoKTtcblx0bWFrZUFscGhhYmV0KCk7XG59O1xuXG4vLyB0aGlzIG5lZWRzIHRvIGJlIGEgZGVlcGVyIHNvcnRcbmNvbnN0IHNvcnRCeVRpdGxlID0gKCkgPT4ge1xuXHRlbnRyaWVzLmJ5VGl0bGUuc29ydCgoYSwgYikgPT4ge1xuXHRcdGxldCBhVGl0bGUgPSBhLnRpdGxlWzBdLnRvVXBwZXJDYXNlKCk7XG5cdFx0bGV0IGJUaXRsZSA9IGIudGl0bGVbMF0udG9VcHBlckNhc2UoKTtcblx0XHRpZiAoYVRpdGxlID4gYlRpdGxlKSByZXR1cm4gMTtcblx0XHRlbHNlIGlmIChhVGl0bGUgPCBiVGl0bGUpIHJldHVybiAtMTtcblx0XHRlbHNlIHJldHVybiAwO1xuXHR9KTtcbn07XG5cbmNvbnN0IHNldERhdGEgPSAoZGF0YSkgPT4ge1xuXHRlbnRyaWVzLmJ5QXV0aG9yID0gZGF0YTtcblx0ZW50cmllcy5ieVRpdGxlID0gZGF0YS5zbGljZSgpOyAvLyBjb3BpZXMgZGF0YSBmb3IgYnlUaXRsZSBzb3J0XG5cdHNvcnRCeVRpdGxlKCk7XG5cdHJlbmRlckVudHJpZXMoKTtcbn1cblxuY29uc3QgZmV0Y2hEYXRhID0gKCkgPT4ge1xuXHRcdGZldGNoKERCKS50aGVuKHJlcyA9PlxuXHRcdFx0cmVzLmpzb24oKVxuXHRcdCkudGhlbihkYXRhID0+IHtcblx0XHRcdHNldERhdGEoZGF0YSk7XG5cdFx0fSlcblx0XHQudGhlbigoKSA9PiB7XG5cdFx0XHQkbG9hZGluZy5mb3JFYWNoKGVsZW0gPT4gZWxlbS5jbGFzc0xpc3QuYWRkKCdyZWFkeScpKTtcblx0XHRcdCRuYXYuY2xhc3NMaXN0LmFkZCgncmVhZHknKTtcblx0XHR9KVxuXHRcdC5jYXRjaChlcnIgPT4gY29uc29sZS53YXJuKGVycikpO1xufTtcblxuY29uc3QgaW5pdCA9ICgpID0+IHtcblx0c21vb3Roc2Nyb2xsLnBvbHlmaWxsKCk7XG5cdGZldGNoRGF0YSgpO1xuXHRuYXZMZygpO1xuXHRyZW5kZXJFbnRyaWVzKCk7XG5cdGFkZFNvcnRCdXR0b25MaXN0ZW5lcnMoKTtcblx0YXR0YWNoQXJyb3dMaXN0ZW5lcnMoKTtcblx0YXR0YWNoTW9kYWxMaXN0ZW5lcnMoKTtcbn1cblxuaW5pdCgpO1xuIiwiY29uc3QgdGVtcGxhdGUgPSBcblx0YDxkaXYgY2xhc3M9XCJuYXZfX2lubmVyXCI+XG5cdFx0PGRpdiBjbGFzcz1cIm5hdl9fc29ydC1ieVwiPlxuXHRcdFx0PHNwYW4gY2xhc3M9XCJzb3J0LWJ5X190aXRsZVwiPlNvcnQgYnk8L3NwYW4+XG5cdFx0XHQ8YnV0dG9uIGNsYXNzPVwic29ydC1ieSBzb3J0LWJ5X19ieS1hcnRpc3QgYWN0aXZlXCIgaWQ9XCJqcy1ieS1hcnRpc3RcIj5BcnRpc3Q8L2J1dHRvbj5cblx0XHRcdDxzcGFuIGNsYXNzPVwic29ydC1ieV9fZGl2aWRlclwiPiB8IDwvc3Bhbj5cblx0XHRcdDxidXR0b24gY2xhc3M9XCJzb3J0LWJ5IHNvcnQtYnlfX2J5LXRpdGxlXCIgaWQ9XCJqcy1ieS10aXRsZVwiPlRpdGxlPC9idXR0b24+XG5cdFx0XHQ8c3BhbiBjbGFzcz1cImZpbmRcIiBpZD1cImpzLWZpbmRcIj5cblx0XHRcdFx0KDxzcGFuIGNsYXNzPVwiZmluZC0taW5uZXJcIj4mIzg5ODQ7Rjwvc3Bhbj4pXG5cdFx0XHQ8L3NwYW4+XG5cdFx0PC9kaXY+XG5cdFx0PGRpdiBjbGFzcz1cIm5hdl9fYWxwaGFiZXRcIj5cblx0XHRcdDxzcGFuIGNsYXNzPVwiYWxwaGFiZXRfX3RpdGxlXCI+R28gdG88L3NwYW4+XG5cdFx0XHQ8ZGl2IGNsYXNzPVwiYWxwaGFiZXRfX2xldHRlcnNcIj48L2Rpdj5cblx0XHQ8L2Rpdj5cblx0PC9kaXY+YDtcblxuY29uc3QgbmF2TGcgPSAoKSA9PiB7XG5cdGxldCBuYXZPdXRlciA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdqcy1uYXYnKTtcblx0bmF2T3V0ZXIuaW5uZXJIVE1MID0gdGVtcGxhdGU7XG59O1xuXG5leHBvcnQgZGVmYXVsdCBuYXZMZzsiXSwicHJlRXhpc3RpbmdDb21tZW50IjoiLy8jIHNvdXJjZU1hcHBpbmdVUkw9ZGF0YTphcHBsaWNhdGlvbi9qc29uO2NoYXJzZXQ9dXRmLTg7YmFzZTY0LGV5SjJaWEp6YVc5dUlqb3pMQ0p6YjNWeVkyVnpJanBiSW01dlpHVmZiVzlrZFd4bGN5OWljbTkzYzJWeUxYQmhZMnN2WDNCeVpXeDFaR1V1YW5NaUxDSnViMlJsWDIxdlpIVnNaWE12YzIxdmIzUm9jMk55YjJ4c0xYQnZiSGxtYVd4c0wyUnBjM1F2YzIxdmIzUm9jMk55YjJ4c0xtcHpJaXdpYzNKakwycHpMMkZ5ZEdsamJHVXRkR1Z0Y0d4aGRHVXVhbk1pTENKemNtTXZhbk12YVc1a1pYZ3Vhbk1pTENKemNtTXZhbk12Ym1GMkxXeG5MbXB6SWwwc0ltNWhiV1Z6SWpwYlhTd2liV0Z3Y0dsdVozTWlPaUpCUVVGQk8wRkRRVUU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHM3T3pzN096dEJRM1ppUVN4SlFVRk5MRGd3UWtGQlRqczdhMEpCZFVKbExHVTdPenM3TzBGRGRrSm1PenM3TzBGQlJVRTdPenM3UVVGRFFUczdPenM3TzBGQlIwRXNTVUZCVFN4TFFVRkxMQ3RHUVVGWU8wRkJRMEVzU1VGQlRTeFhRVUZYTEVOQlFVTXNSMEZCUkN4RlFVRk5MRWRCUVU0c1JVRkJWeXhIUVVGWUxFVkJRV2RDTEVkQlFXaENMRVZCUVhGQ0xFZEJRWEpDTEVWQlFUQkNMRWRCUVRGQ0xFVkJRU3RDTEVkQlFTOUNMRVZCUVc5RExFZEJRWEJETEVWQlFYbERMRWRCUVhwRExFVkJRVGhETEVkQlFUbERMRVZCUVcxRUxFZEJRVzVFTEVWQlFYZEVMRWRCUVhoRUxFVkJRVFpFTEVkQlFUZEVMRVZCUVd0RkxFZEJRV3hGTEVWQlFYVkZMRWRCUVhaRkxFVkJRVFJGTEVkQlFUVkZMRVZCUVdsR0xFZEJRV3BHTEVWQlFYTkdMRWRCUVhSR0xFVkJRVEpHTEVkQlFUTkdMRVZCUVdkSExFZEJRV2hITEVWQlFYRkhMRWRCUVhKSExFVkJRVEJITEVkQlFURkhMRVZCUVN0SExFZEJRUzlITEVWQlFXOUlMRWRCUVhCSUxFTkJRV3BDT3p0QlFVVkJMRWxCUVUwc1YwRkJWeXhOUVVGTkxFbEJRVTRzUTBGQlZ5eFRRVUZUTEdkQ1FVRlVMRU5CUVRCQ0xGVkJRVEZDTEVOQlFWZ3NRMEZCYWtJN1FVRkRRU3hKUVVGTkxFOUJRVThzVTBGQlV5eGpRVUZVTEVOQlFYZENMRkZCUVhoQ0xFTkJRV0k3UVVGRFFTeEpRVUZOTEZsQlFWa3NVMEZCVXl4aFFVRlVMRU5CUVhWQ0xGZEJRWFpDTEVOQlFXeENPMEZCUTBFc1NVRkJUU3hYUVVGWExGTkJRVk1zWVVGQlZDeERRVUYxUWl4VlFVRjJRaXhEUVVGcVFqdEJRVU5CTEVsQlFVMHNVMEZCVXl4VFFVRlRMR05CUVZRc1EwRkJkMElzVlVGQmVFSXNRMEZCWmp0QlFVTkJMRWxCUVUwc1UwRkJVeXhUUVVGVExHRkJRVlFzUTBGQmRVSXNVVUZCZGtJc1EwRkJaanRCUVVOQkxFbEJRVTBzVTBGQlV5eFRRVUZUTEdGQlFWUXNRMEZCZFVJc1VVRkJka0lzUTBGQlpqdEJRVU5CTEVsQlFVMHNXVUZCV1N4VFFVRlRMR0ZCUVZRc1EwRkJkVUlzVjBGQmRrSXNRMEZCYkVJN1FVRkRRU3hKUVVGTkxGRkJRVkVzVTBGQlV5eGhRVUZVTEVOQlFYVkNMR2RDUVVGMlFpeERRVUZrT3p0QlFVVkJMRWxCUVVrc1ZVRkJWU3hEUVVGa0xFTXNRMEZCYVVJN1FVRkRha0lzU1VGQlNTeFZRVUZWTEVWQlFVVXNWVUZCVlN4RlFVRmFMRVZCUVdkQ0xGTkJRVk1zUlVGQmVrSXNSVUZCWkR0QlFVTkJMRWxCUVVrc1owSkJRV2RDTEVkQlFYQkNPenRCUVVWQkxFbEJRVWtzVjBGQlZ5eExRVUZtTzBGQlEwRXNTVUZCU1N4TFFVRkxMRXRCUVZRN1FVRkRRU3hKUVVGTkxIVkNRVUYxUWl4VFFVRjJRaXh2UWtGQmRVSXNSMEZCVFR0QlFVTnNReXhMUVVGSkxGVkJRVlVzVFVGQlRTeEpRVUZPTEVOQlFWY3NVMEZCVXl4blFrRkJWQ3hEUVVFd1FpeG5Ra0ZCTVVJc1EwRkJXQ3hEUVVGa096dEJRVVZCTEZOQlFWRXNUMEZCVWl4RFFVRm5RaXhsUVVGUE8wRkJRM1JDTEUxQlFVa3NaMEpCUVVvc1EwRkJjVUlzVDBGQmNrSXNSVUZCT0VJc1ZVRkJReXhIUVVGRUxFVkJRVk03UVVGRGRFTXNUMEZCU1N4RFFVRkRMRkZCUVV3c1JVRkJaVHRCUVVOa0xGRkJRVWtzVFVGQlRTeEpRVUZKTEVkQlFXUTdRVUZEUVRzN1FVRkZRU3hqUVVGVkxGTkJRVllzUTBGQmIwSXNSMEZCY0VJc1EwRkJkMElzVlVGQmVFSTdRVUZEUVN4VlFVRk5MRmxCUVU0c1EwRkJiVUlzVDBGQmJrSXNOa0pCUVhGRUxFZEJRWEpFTzBGQlEwRXNaVUZCVnl4SlFVRllPMEZCUTBFN1FVRkRSQ3hIUVZSRU8wRkJWVUVzUlVGWVJEczdRVUZoUVN4UFFVRk5MR2RDUVVGT0xFTkJRWFZDTEU5QlFYWkNMRVZCUVdkRExGbEJRVTA3UVVGRGNrTXNUVUZCU1N4UlFVRktMRVZCUVdNN1FVRkRZaXhoUVVGVkxGTkJRVllzUTBGQmIwSXNUVUZCY0VJc1EwRkJNa0lzVlVGQk0wSTdRVUZEUVN4aFFVRlZMR2xDUVVGV0xFTkJRVFJDTEZOQlFUVkNMRU5CUVhORExFMUJRWFJETEVOQlFUWkRMRk5CUVRkRE8wRkJRMEVzWTBGQlZ5eExRVUZZTzBGQlEwRTdRVUZEUkN4RlFVNUVPMEZCVDBFc1EwRjJRa1E3TzBGQmVVSkJMRWxCUVVrc1VVRkJVU3hMUVVGYU8wRkJRMEVzU1VGQlRTeDFRa0ZCZFVJc1UwRkJka0lzYjBKQlFYVkNMRWRCUVUwN1FVRkRiRU1zUzBGQlRTeFJRVUZSTEZOQlFWTXNZMEZCVkN4RFFVRjNRaXhUUVVGNFFpeERRVUZrT3p0QlFVVkJMRTlCUVUwc1owSkJRVTRzUTBGQmRVSXNUMEZCZGtJc1JVRkJaME1zV1VGQlRUdEJRVU55UXl4VFFVRlBMRk5CUVZBc1EwRkJhVUlzUjBGQmFrSXNRMEZCY1VJc1RVRkJja0k3UVVGRFFTeFZRVUZSTEVsQlFWSTdRVUZEUVN4RlFVaEVPenRCUVV0QkxGRkJRVThzWjBKQlFWQXNRMEZCZDBJc1QwRkJlRUlzUlVGQmFVTXNXVUZCVFR0QlFVTjBReXhUUVVGUExGTkJRVkFzUTBGQmFVSXNUVUZCYWtJc1EwRkJkMElzVFVGQmVFSTdRVUZEUVN4VlFVRlJMRXRCUVZJN1FVRkRRU3hGUVVoRU96dEJRVXRCTEZGQlFVOHNaMEpCUVZBc1EwRkJkMElzVTBGQmVFSXNSVUZCYlVNc1dVRkJUVHRCUVVONFF5eE5RVUZKTEV0QlFVb3NSVUZCVnp0QlFVTldMR05CUVZjc1dVRkJUVHRCUVVOb1FpeFhRVUZQTEZOQlFWQXNRMEZCYVVJc1RVRkJha0lzUTBGQmQwSXNUVUZCZUVJN1FVRkRRU3haUVVGUkxFdEJRVkk3UVVGRFFTeEpRVWhFTEVWQlIwY3NSMEZJU0R0QlFVbEJPMEZCUTBRc1JVRlFSRHRCUVZGQkxFTkJja0pFT3p0QlFYVkNRU3hKUVVGTkxHTkJRV01zVTBGQlpDeFhRVUZqTEVkQlFVMDdRVUZEZWtJc1MwRkJTU3hSUVVGUkxGTkJRVk1zWTBGQlZDeERRVUYzUWl4bFFVRjRRaXhEUVVGYU8wRkJRMEVzVDBGQlRTeGpRVUZPTEVOQlFYRkNMRVZCUVVNc1ZVRkJWU3hSUVVGWUxFVkJRWEZDTEU5QlFVOHNUMEZCTlVJc1JVRkJja0k3UVVGRFFTeERRVWhFT3p0QlFVdEJMRWxCUVVrc1lVRkJTanRCUVVOQkxFbEJRVWtzVlVGQlZTeERRVUZrTzBGQlEwRXNTVUZCU1N4WlFVRlpMRXRCUVdoQ08wRkJRMEVzU1VGQlRTeDFRa0ZCZFVJc1UwRkJka0lzYjBKQlFYVkNMRWRCUVUwN1FVRkRiRU1zVVVGQlR5eG5Ra0ZCVUN4RFFVRjNRaXhQUVVGNFFpeEZRVUZwUXl4WlFVRk5PMEZCUTNSRE8wRkJRMEVzUlVGR1JEczdRVUZKUVN4WFFVRlZMR2RDUVVGV0xFTkJRVEpDTEZGQlFUTkNMRVZCUVhGRExGbEJRVTA3TzBGQlJURkRMRTFCUVVrc1NVRkJTU3hQUVVGUExIRkNRVUZRTEVkQlFTdENMRU5CUVhaRE8wRkJRMEVzVFVGQlNTeFpRVUZaTEVOQlFXaENMRVZCUVcxQ08wRkJRMnhDTEZWQlFVOHNUMEZCVUR0QlFVTkJMR0ZCUVZVc1EwRkJWanRCUVVOQk96dEJRVVZFTEUxQlFVa3NTMEZCU3l4RFFVRkRMRVZCUVU0c1NVRkJXU3hEUVVGRExGTkJRV3BDTEVWQlFUUkNPMEZCUXpOQ0xGVkJRVThzVTBGQlVDeERRVUZwUWl4SFFVRnFRaXhEUVVGeFFpeE5RVUZ5UWp0QlFVTkJMR1ZCUVZrc1NVRkJXanRCUVVOQkxFZEJTRVFzVFVGSFR5eEpRVUZKTEVsQlFVa3NRMEZCUXl4RlFVRk1MRWxCUVZjc1UwRkJaaXhGUVVFd1FqdEJRVU5vUXl4VlFVRlBMRk5CUVZBc1EwRkJhVUlzVFVGQmFrSXNRMEZCZDBJc1RVRkJlRUk3UVVGRFFTeGxRVUZaTEV0QlFWbzdRVUZEUVR0QlFVTkVMRVZCWmtRN1FVRm5Ra0VzUTBGeVFrUTdPMEZCZFVKQkxFbEJRVTBzZVVKQlFYbENMRk5CUVhwQ0xITkNRVUY1UWl4SFFVRk5PMEZCUTNCRExFdEJRVWtzV1VGQldTeFRRVUZUTEdOQlFWUXNRMEZCZDBJc1kwRkJlRUlzUTBGQmFFSTdRVUZEUVN4TFFVRkpMRmRCUVZjc1UwRkJVeXhqUVVGVUxFTkJRWGRDTEdGQlFYaENMRU5CUVdZN1FVRkRRU3hYUVVGVkxHZENRVUZXTEVOQlFUSkNMRTlCUVROQ0xFVkJRVzlETEZsQlFVMDdRVUZEZWtNc1RVRkJTU3hQUVVGS0xFVkJRV0U3UVVGRFdqdEJRVU5CTEdGQlFWVXNRMEZCVmp0QlFVTkJMR0ZCUVZVc1UwRkJWaXhEUVVGdlFpeEhRVUZ3UWl4RFFVRjNRaXhSUVVGNFFqdEJRVU5CTEZsQlFWTXNVMEZCVkN4RFFVRnRRaXhOUVVGdVFpeERRVUV3UWl4UlFVRXhRanM3UVVGRlFUdEJRVU5CTzBGQlEwUXNSVUZVUkRzN1FVRlhRU3hWUVVGVExHZENRVUZVTEVOQlFUQkNMRTlCUVRGQ0xFVkJRVzFETEZsQlFVMDdRVUZEZUVNc1RVRkJTU3hEUVVGRExFOUJRVXdzUlVGQll6dEJRVU5pTzBGQlEwRXNZVUZCVlN4RFFVRldPMEZCUTBFc1dVRkJVeXhUUVVGVUxFTkJRVzFDTEVkQlFXNUNMRU5CUVhWQ0xGRkJRWFpDTzBGQlEwRXNZVUZCVlN4VFFVRldMRU5CUVc5Q0xFMUJRWEJDTEVOQlFUSkNMRkZCUVROQ096dEJRVVZCTzBGQlEwRTdRVUZEUkN4RlFWUkVPMEZCVlVFc1EwRjRRa1E3TzBGQk1FSkJMRWxCUVUwc1pVRkJaU3hUUVVGbUxGbEJRV1VzUTBGQlF5eFpRVUZFTEVWQlFXdENPMEZCUTNSRExFdEJRVWtzVjBGQlZ5eE5RVUZOTEVsQlFVNHNRMEZCVnl4VFFVRlRMR2RDUVVGVUxFTkJRVEJDTEZsQlFURkNMRU5CUVZnc1EwRkJaanRCUVVOQkxGVkJRVk1zVDBGQlZDeERRVUZwUWp0QlFVRkJMRk5CUVZNc1RVRkJUU3hsUVVGT0xFTkJRWE5DTEUxQlFYUkNMRU5CUVZRN1FVRkJRU3hGUVVGcVFqdEJRVU5CTEVOQlNFUTdPMEZCUzBFc1NVRkJUU3hwUWtGQmFVSXNVMEZCYWtJc1kwRkJhVUlzUTBGQlF5eEpRVUZFTEVWQlFWVTdRVUZEYUVNc1MwRkJTU3hYUVVGWExGVkJRVlVzYVVKQlFWWXNSMEZCT0VJc2EwSkJRVGRETzBGQlEwRXNTMEZCU1N4bFFVRmxMRU5CUVVNc1QwRkJSQ3hIUVVGWExHbENRVUZZTEVkQlFTdENMR3RDUVVGc1JEdEJRVU5CTEV0QlFVa3NWMEZCVnl4TlFVRk5MRWxCUVU0c1EwRkJWeXhUUVVGVExHZENRVUZVTEVOQlFUQkNMRkZCUVRGQ0xFTkJRVmdzUTBGQlpqczdRVUZGUVN4alFVRmhMRmxCUVdJN08wRkJSVUVzVVVGQlR5eFRRVUZUTEVsQlFWUXNRMEZCWXl4cFFrRkJVenRCUVVNM1FpeE5RVUZKTEU5QlFVOHNUVUZCVFN4clFrRkJha0k3UVVGRFFTeFRRVUZQTEV0QlFVc3NVMEZCVEN4RFFVRmxMRU5CUVdZc1RVRkJjMElzU1VGQmRFSXNTVUZCT0VJc1MwRkJTeXhUUVVGTUxFTkJRV1VzUTBGQlppeE5RVUZ6UWl4TFFVRkxMRmRCUVV3c1JVRkJNMFE3UVVGRFFTeEZRVWhOTEVOQlFWQTdRVUZKUVN4RFFWaEVPenRCUVdOQkxFbEJRVTBzWlVGQlpTeFRRVUZtTEZsQlFXVXNSMEZCVFR0QlFVTXhRaXhMUVVGTkxIVkNRVUYxUWl4VFFVRjJRaXh2UWtGQmRVSXNRMEZCUXl4UFFVRkVMRVZCUVZVc1RVRkJWaXhGUVVGeFFqdEJRVU5xUkN4VlFVRlJMR2RDUVVGU0xFTkJRWGxDTEU5QlFYcENMRVZCUVd0RExGbEJRVTA3UVVGRGRrTXNUMEZCVFN4aFFVRmhMRk5CUVZNc1kwRkJWQ3hEUVVGM1FpeE5RVUY0UWl4RFFVRnVRanRCUVVOQkxFOUJRVWtzWlVGQlNqczdRVUZGUVN4UFFVRkpMRU5CUVVNc1QwRkJUQ3hGUVVGak8wRkJRMklzWVVGQlV5eFhRVUZYTEVkQlFWZ3NSMEZCYVVJc1UwRkJVeXhqUVVGVUxFTkJRWGRDTEdWQlFYaENMRU5CUVdwQ0xFZEJRVFJFTEZkQlFWY3NZVUZCV0N4RFFVRjVRaXhoUVVGNlFpeERRVUYxUXl4aFFVRjJReXhEUVVGeFJDeGhRVUZ5UkN4RFFVRnRSU3h6UWtGQmJrVXNRMEZCTUVZc1lVRkJNVVlzUTBGQmQwY3NNa0pCUVhoSExFTkJRWEpGTzBGQlEwRXNTVUZHUkN4TlFVVlBPMEZCUTA0c1lVRkJVeXhYUVVGWExFZEJRVmdzUjBGQmFVSXNVMEZCVXl4alFVRlVMRU5CUVhkQ0xHVkJRWGhDTEVOQlFXcENMRWRCUVRSRUxGZEJRVmNzWVVGQldDeERRVUY1UWl4aFFVRjZRaXhEUVVGMVF5eGhRVUYyUXl4RFFVRnhSQ3h6UWtGQmNrUXNRMEZCTkVVc1lVRkJOVVVzUTBGQk1FWXNNa0pCUVRGR0xFTkJRWEpGTzBGQlEwRTdPMEZCUlVRc1ZVRkJUeXhqUVVGUUxFTkJRWE5DTEVWQlFVTXNWVUZCVlN4UlFVRllMRVZCUVhGQ0xFOUJRVThzVDBGQk5VSXNSVUZCZEVJN1FVRkRRU3hIUVZoRU8wRkJXVUVzUlVGaVJEczdRVUZsUVN4TFFVRkpMR2RDUVVGblFpeEZRVUZ3UWp0QlFVTkJMRXRCUVVrc1UwRkJVeXhUUVVGVExHRkJRVlFzUTBGQmRVSXNiMEpCUVhaQ0xFTkJRV0k3UVVGRFFTeFJRVUZQTEZOQlFWQXNSMEZCYlVJc1JVRkJia0k3TzBGQlJVRXNWVUZCVXl4UFFVRlVMRU5CUVdsQ0xHdENRVUZWTzBGQlF6RkNMRTFCUVVrc1kwRkJZeXhsUVVGbExFMUJRV1lzUTBGQmJFSTdRVUZEUVN4TlFVRkpMRlZCUVZVc1UwRkJVeXhoUVVGVUxFTkJRWFZDTEVkQlFYWkNMRU5CUVdRN08wRkJSVUVzVFVGQlNTeERRVUZETEZkQlFVd3NSVUZCYTBJN08wRkJSV3hDTEdOQlFWa3NSVUZCV2l4SFFVRnBRaXhOUVVGcVFqdEJRVU5CTEZWQlFWRXNVMEZCVWl4SFFVRnZRaXhQUVVGUExGZEJRVkFzUlVGQmNFSTdRVUZEUVN4VlFVRlJMRk5CUVZJc1IwRkJiMElzZVVKQlFYQkNPenRCUVVWQkxIVkNRVUZ4UWl4UFFVRnlRaXhGUVVFNFFpeE5RVUU1UWp0QlFVTkJMRk5CUVU4c1YwRkJVQ3hEUVVGdFFpeFBRVUZ1UWp0QlFVTkJMRVZCV2tRN1FVRmhRU3hEUVdwRFJEczdRVUZ0UTBFc1NVRkJUU3hsUVVGbExGTkJRV1lzV1VGQlpTeERRVUZETEUxQlFVUXNSVUZCVXl4UFFVRlVMRVZCUVhGQ08wRkJRM3BETEZGQlFVOHNUMEZCVUN4RFFVRmxMR2xDUVVGVE8wRkJRM1pDTEUxQlFVMHNLMEpCUVRaQ0xFdEJRVzVETzBGQlEwRXNUVUZCVFN4WlFVRlpMRk5CUVZNc1lVRkJWQ3hEUVVGMVFpeExRVUYyUWl4RFFVRnNRanRCUVVOQkxFMUJRVTBzVDBGQlR5eFRRVUZUTEdGQlFWUXNRMEZCZFVJc1MwRkJka0lzUTBGQllqdEJRVU5CTEU5QlFVc3NVMEZCVEN4SFFVRnBRaXhsUVVGcVFqdEJRVU5CTEU5QlFVc3NSMEZCVEN4SFFVRlhMRWRCUVZnN1FVRkRRU3haUVVGVkxGZEJRVllzUTBGQmMwSXNTVUZCZEVJN1FVRkRRU3hWUVVGUkxGZEJRVklzUTBGQmIwSXNVMEZCY0VJN1FVRkRRU3hGUVZKRU8wRkJVMEVzUTBGV1JEczdRVUZaUVN4SlFVRk5MR2RDUVVGblFpeFRRVUZvUWl4aFFVRm5RaXhIUVVGTk8wRkJRek5DTEV0QlFVMHNaVUZCWlN4VFFVRlRMR05CUVZRc1EwRkJkMElzVTBGQmVFSXNRMEZCY2tJN1FVRkRRU3hMUVVGTkxHTkJRV01zVlVGQlZTeFJRVUZSTEU5QlFXeENMRWRCUVRSQ0xGRkJRVkVzVVVGQmVFUTdPMEZCUlVFc1kwRkJZU3hUUVVGaUxFZEJRWGxDTEVWQlFYcENPenRCUVVWQkxHRkJRVmtzVDBGQldpeERRVUZ2UWl4cFFrRkJVenRCUVVGQkxFMUJRM0JDTEV0QlJHOUNMRWRCUTNkRExFdEJSSGhETEVOQlEzQkNMRXRCUkc5Q08wRkJRVUVzVFVGRFlpeFJRVVJoTEVkQlEzZERMRXRCUkhoRExFTkJRMklzVVVGRVlUdEJRVUZCTEUxQlEwZ3NVMEZFUnl4SFFVTjNReXhMUVVSNFF5eERRVU5JTEZOQlJFYzdRVUZCUVN4TlFVTlJMRTFCUkZJc1IwRkRkME1zUzBGRWVFTXNRMEZEVVN4TlFVUlNPMEZCUVVFc1RVRkRaMElzVjBGRWFFSXNSMEZEZDBNc1MwRkVlRU1zUTBGRFowSXNWMEZFYUVJN1FVRkJRU3hOUVVNMlFpeE5RVVEzUWl4SFFVTjNReXhMUVVSNFF5eERRVU0yUWl4TlFVUTNRanM3TzBGQlJ6VkNMR1ZCUVdFc2EwSkJRV0lzUTBGQlowTXNWMEZCYUVNc1JVRkJOa01zZVVKQlFUZERPenRCUVVWQkxFMUJRVTBzWTBGQll5eFRRVUZUTEdkQ1FVRlVMRU5CUVRCQ0xIZENRVUV4UWl4RFFVRndRanRCUVVOQkxFMUJRVTBzVlVGQlZTeFpRVUZaTEZsQlFWa3NUVUZCV2l4SFFVRnhRaXhEUVVGcVF5eERRVUZvUWp0QlFVTkJPenRCUVVWQkxFMUJRVWtzVDBGQlR5eE5RVUZZTEVWQlFXMUNMR0ZCUVdFc1RVRkJZaXhGUVVGeFFpeFBRVUZ5UWpzN1FVRkZia0lzVFVGQlRTeHZRa0ZCYjBJc1UwRkJVeXhoUVVGVUxFTkJRWFZDTEV0QlFYWkNMRU5CUVRGQ08wRkJRMEVzVFVGQlRTeHRRa0ZCYlVJc1UwRkJVeXhoUVVGVUxFTkJRWFZDTEVkQlFYWkNMRU5CUVhwQ08wRkJRMEVzVFVGQlRTeGpRVUZqTEZOQlFWTXNZVUZCVkN4RFFVRjFRaXhIUVVGMlFpeERRVUZ3UWp0QlFVTkJMRzlDUVVGclFpeFRRVUZzUWl4RFFVRTBRaXhIUVVFMVFpeERRVUZuUXl3MFFrRkJhRU03UVVGRFFTeHRRa0ZCYVVJc1UwRkJha0lzUTBGQk1rSXNSMEZCTTBJc1EwRkJLMElzY1VKQlFTOUNPMEZCUTBFc1kwRkJXU3hUUVVGYUxFTkJRWE5DTEVkQlFYUkNMRU5CUVRCQ0xHZENRVUV4UWpzN1FVRkZRU3h0UWtGQmFVSXNVMEZCYWtJc1IwRkJOa0lzVjBGQk4wSTdRVUZEUVN4alFVRlpMRk5CUVZvc1IwRkJkMElzVFVGQmVFSTdPMEZCUlVFc2IwSkJRV3RDTEZkQlFXeENMRU5CUVRoQ0xHZENRVUU1UWl4RlFVRm5SQ3hYUVVGb1JEdEJRVU5CTEZWQlFWRXNWMEZCVWl4RFFVRnZRaXhwUWtGQmNFSTdPMEZCUlVFc1RVRkJUU3hqUVVGakxGTkJRVk1zWjBKQlFWUXNRMEZCTUVJc2VVSkJRVEZDTEVOQlFYQkNPMEZCUTBFc1RVRkJUU3hUUVVGVExGbEJRVmtzV1VGQldTeE5RVUZhTEVkQlFYRkNMRU5CUVdwRExFTkJRV1k3TzBGQlJVRXNUVUZCVFN4alFVRmpMRk5CUVZNc1owSkJRVlFzUTBGQk1FSXNLMEpCUVRGQ0xFTkJRWEJDTzBGQlEwRXNUVUZCVFN4VFFVRlRMRmxCUVZrc1dVRkJXU3hOUVVGYUxFZEJRWEZDTEVOQlFXcERMRU5CUVdZN08wRkJSVUVzVFVGQlRTeGhRVUZoTEZOQlFWTXNaMEpCUVZRc1EwRkJNRUlzT0VKQlFURkNMRU5CUVc1Q08wRkJRMEVzVFVGQlRTeFJRVUZSTEZkQlFWY3NWMEZCVnl4TlFVRllMRWRCUVc5Q0xFTkJRUzlDTEVOQlFXUTdPMEZCUlVFc1UwRkJUeXhUUVVGUUxFZEJRVzFDTEV0QlFXNUNPMEZCUTBFc1UwRkJUeXhUUVVGUUxFZEJRVzFDTEZOQlFXNUNPMEZCUTBFc1VVRkJUU3hUUVVGT0xFZEJRV3RDTEZGQlFXeENPenRCUVVWQkxFMUJRVTBzWVVGQllTeFJRVUZSTEdGQlFWSXNRMEZCYzBJc1lVRkJkRUlzUTBGQmIwTXNZVUZCY0VNc1EwRkJia0k3UVVGRFFTeE5RVUZOTEdGQlFXRXNVVUZCVVN4aFFVRlNMRU5CUVhOQ0xHRkJRWFJDTEVOQlFXOURMR0ZCUVhCRExFTkJRVzVDT3p0QlFVVkJMRTFCUVVrc1ZVRkJWU3hSUVVGUkxHbENRVUYwUWp0QlFVTkJMR0ZCUVZjc1owSkJRVmdzUTBGQk5FSXNUMEZCTlVJc1JVRkJjVU1zV1VGQlRUdEJRVU14UXl4UFFVRk5MRTlCUVU4c1VVRkJVU3hyUWtGQmNrSTdRVUZEUVN4UFFVRkpMRWxCUVVvc1JVRkJWVHRCUVVOVUxGTkJRVXNzWTBGQlRDeERRVUZ2UWl4RlFVRkRMRlZCUVZVc1VVRkJXQ3hGUVVGeFFpeFBRVUZQTEZOQlFUVkNMRVZCUVhWRExGRkJRVkVzVVVGQkwwTXNSVUZCY0VJN1FVRkRRU3hqUVVGVkxFbEJRVlk3UVVGRFFUdEJRVU5FTEVkQlRrUTdPMEZCVVVFc1lVRkJWeXhuUWtGQldDeERRVUUwUWl4UFFVRTFRaXhGUVVGeFF5eFpRVUZOTzBGQlF6RkRMRTlCUVUwc1QwRkJUeXhSUVVGUkxITkNRVUZ5UWp0QlFVTkJMRTlCUVVrc1NVRkJTaXhGUVVGVk8wRkJRMVFzVTBGQlN5eGpRVUZNTEVOQlFXOUNMRVZCUVVNc1ZVRkJWU3hSUVVGWUxFVkJRWEZDTEU5QlFVOHNVMEZCTlVJc1JVRkJkVU1zVVVGQlVTeFJRVUV2UXl4RlFVRndRanRCUVVOQkxHTkJRVlVzU1VGQlZqdEJRVU5CTzBGQlEwUXNSMEZPUkR0QlFVOUJMRVZCZUVSRU96dEJRVEJFUVR0QlFVTkJPMEZCUTBFc1EwRnNSVVE3TzBGQmIwVkJPMEZCUTBFc1NVRkJUU3hqUVVGakxGTkJRV1FzVjBGQll5eEhRVUZOTzBGQlEzcENMRk5CUVZFc1QwRkJVaXhEUVVGblFpeEpRVUZvUWl4RFFVRnhRaXhWUVVGRExFTkJRVVFzUlVGQlNTeERRVUZLTEVWQlFWVTdRVUZET1VJc1RVRkJTU3hUUVVGVExFVkJRVVVzUzBGQlJpeERRVUZSTEVOQlFWSXNSVUZCVnl4WFFVRllMRVZCUVdJN1FVRkRRU3hOUVVGSkxGTkJRVk1zUlVGQlJTeExRVUZHTEVOQlFWRXNRMEZCVWl4RlFVRlhMRmRCUVZnc1JVRkJZanRCUVVOQkxFMUJRVWtzVTBGQlV5eE5RVUZpTEVWQlFYRkNMRTlCUVU4c1EwRkJVQ3hEUVVGeVFpeExRVU5MTEVsQlFVa3NVMEZCVXl4TlFVRmlMRVZCUVhGQ0xFOUJRVThzUTBGQlF5eERRVUZTTEVOQlFYSkNMRXRCUTBFc1QwRkJUeXhEUVVGUU8wRkJRMHdzUlVGT1JEdEJRVTlCTEVOQlVrUTdPMEZCVlVFc1NVRkJUU3hWUVVGVkxGTkJRVllzVDBGQlZTeERRVUZETEVsQlFVUXNSVUZCVlR0QlFVTjZRaXhUUVVGUkxGRkJRVklzUjBGQmJVSXNTVUZCYmtJN1FVRkRRU3hUUVVGUkxFOUJRVklzUjBGQmEwSXNTMEZCU3l4TFFVRk1MRVZCUVd4Q0xFTkJSbmxDTEVOQlJVODdRVUZEYUVNN1FVRkRRVHRCUVVOQkxFTkJURVE3TzBGQlQwRXNTVUZCVFN4WlFVRlpMRk5CUVZvc1UwRkJXU3hIUVVGTk8wRkJRM1JDTEU5QlFVMHNSVUZCVGl4RlFVRlZMRWxCUVZZc1EwRkJaVHRCUVVGQkxGTkJRMlFzU1VGQlNTeEpRVUZLTEVWQlJHTTdRVUZCUVN4RlFVRm1MRVZCUlVVc1NVRkdSaXhEUVVWUExHZENRVUZSTzBGQlEyUXNWVUZCVVN4SlFVRlNPMEZCUTBFc1JVRktSQ3hGUVV0RExFbEJURVFzUTBGTFRTeFpRVUZOTzBGQlExZ3NWMEZCVXl4UFFVRlVMRU5CUVdsQ08wRkJRVUVzVlVGQlVTeExRVUZMTEZOQlFVd3NRMEZCWlN4SFFVRm1MRU5CUVcxQ0xFOUJRVzVDTEVOQlFWSTdRVUZCUVN4SFFVRnFRanRCUVVOQkxFOUJRVXNzVTBGQlRDeERRVUZsTEVkQlFXWXNRMEZCYlVJc1QwRkJia0k3UVVGRFFTeEZRVkpFTEVWQlUwTXNTMEZVUkN4RFFWTlBPMEZCUVVFc1UwRkJUeXhSUVVGUkxFbEJRVklzUTBGQllTeEhRVUZpTEVOQlFWQTdRVUZCUVN4RlFWUlFPMEZCVlVRc1EwRllSRHM3UVVGaFFTeEpRVUZOTEU5QlFVOHNVMEZCVUN4SlFVRlBMRWRCUVUwN1FVRkRiRUlzWjBOQlFXRXNVVUZCWWp0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTEVOQlVrUTdPMEZCVlVFN096czdPenM3TzBGRGJGUkJMRWxCUVUwc2JXMUNRVUZPT3p0QlFXbENRU3hKUVVGTkxGRkJRVkVzVTBGQlVpeExRVUZSTEVkQlFVMDdRVUZEYmtJc1MwRkJTU3hYUVVGWExGTkJRVk1zWTBGQlZDeERRVUYzUWl4UlFVRjRRaXhEUVVGbU8wRkJRMEVzVlVGQlV5eFRRVUZVTEVkQlFYRkNMRkZCUVhKQ08wRkJRMEVzUTBGSVJEczdhMEpCUzJVc1N5SXNJbVpwYkdVaU9pSm5aVzVsY21GMFpXUXVhbk1pTENKemIzVnlZMlZTYjI5MElqb2lJaXdpYzI5MWNtTmxjME52Ym5SbGJuUWlPbHNpS0daMWJtTjBhVzl1S0NsN1puVnVZM1JwYjI0Z2NpaGxMRzRzZENsN1puVnVZM1JwYjI0Z2J5aHBMR1lwZTJsbUtDRnVXMmxkS1h0cFppZ2haVnRwWFNsN2RtRnlJR005WENKbWRXNWpkR2x2Ymx3aVBUMTBlWEJsYjJZZ2NtVnhkV2x5WlNZbWNtVnhkV2x5WlR0cFppZ2haaVltWXlseVpYUjFjbTRnWXlocExDRXdLVHRwWmloMUtYSmxkSFZ5YmlCMUtHa3NJVEFwTzNaaGNpQmhQVzVsZHlCRmNuSnZjaWhjSWtOaGJtNXZkQ0JtYVc1a0lHMXZaSFZzWlNBblhDSXJhU3RjSWlkY0lpazdkR2h5YjNjZ1lTNWpiMlJsUFZ3aVRVOUVWVXhGWDA1UFZGOUdUMVZPUkZ3aUxHRjlkbUZ5SUhBOWJsdHBYVDE3Wlhod2IzSjBjenA3ZlgwN1pWdHBYVnN3WFM1allXeHNLSEF1Wlhod2IzSjBjeXhtZFc1amRHbHZiaWh5S1h0MllYSWdiajFsVzJsZFd6RmRXM0pkTzNKbGRIVnliaUJ2S0c1OGZISXBmU3h3TEhBdVpYaHdiM0owY3l4eUxHVXNiaXgwS1gxeVpYUjFjbTRnYmx0cFhTNWxlSEJ2Y25SemZXWnZjaWgyWVhJZ2RUMWNJbVoxYm1OMGFXOXVYQ0k5UFhSNWNHVnZaaUJ5WlhGMWFYSmxKaVp5WlhGMWFYSmxMR2s5TUR0cFBIUXViR1Z1WjNSb08ya3JLeWx2S0hSYmFWMHBPM0psZEhWeWJpQnZmWEpsZEhWeWJpQnlmU2tvS1NJc0lpOHFJSE50YjI5MGFITmpjbTlzYkNCMk1DNDBMakFnTFNBeU1ERTRJQzBnUkhWemRHRnVJRXRoYzNSbGJpd2dTbVZ5WlcxcFlYTWdUV1Z1YVdOb1pXeHNhU0F0SUUxSlZDQk1hV05sYm5ObElDb3ZYRzRvWm5WdVkzUnBiMjRnS0NrZ2UxeHVJQ0FuZFhObElITjBjbWxqZENjN1hHNWNiaUFnTHk4Z2NHOXNlV1pwYkd4Y2JpQWdablZ1WTNScGIyNGdjRzlzZVdacGJHd29LU0I3WEc0Z0lDQWdMeThnWVd4cFlYTmxjMXh1SUNBZ0lIWmhjaUIzSUQwZ2QybHVaRzkzTzF4dUlDQWdJSFpoY2lCa0lEMGdaRzlqZFcxbGJuUTdYRzVjYmlBZ0lDQXZMeUJ5WlhSMWNtNGdhV1lnYzJOeWIyeHNJR0psYUdGMmFXOXlJR2x6SUhOMWNIQnZjblJsWkNCaGJtUWdjRzlzZVdacGJHd2dhWE1nYm05MElHWnZjbU5sWkZ4dUlDQWdJR2xtSUNoY2JpQWdJQ0FnSUNkelkzSnZiR3hDWldoaGRtbHZjaWNnYVc0Z1pDNWtiMk4xYldWdWRFVnNaVzFsYm5RdWMzUjViR1VnSmlaY2JpQWdJQ0FnSUhjdVgxOW1iM0pqWlZOdGIyOTBhRk5qY205c2JGQnZiSGxtYVd4c1gxOGdJVDA5SUhSeWRXVmNiaUFnSUNBcElIdGNiaUFnSUNBZ0lISmxkSFZ5Ymp0Y2JpQWdJQ0I5WEc1Y2JpQWdJQ0F2THlCbmJHOWlZV3h6WEc0Z0lDQWdkbUZ5SUVWc1pXMWxiblFnUFNCM0xraFVUVXhGYkdWdFpXNTBJSHg4SUhjdVJXeGxiV1Z1ZER0Y2JpQWdJQ0IyWVhJZ1UwTlNUMHhNWDFSSlRVVWdQU0EwTmpnN1hHNWNiaUFnSUNBdkx5QnZZbXBsWTNRZ1oyRjBhR1Z5YVc1bklHOXlhV2RwYm1Gc0lITmpjbTlzYkNCdFpYUm9iMlJ6WEc0Z0lDQWdkbUZ5SUc5eWFXZHBibUZzSUQwZ2UxeHVJQ0FnSUNBZ2MyTnliMnhzT2lCM0xuTmpjbTlzYkNCOGZDQjNMbk5qY205c2JGUnZMRnh1SUNBZ0lDQWdjMk55YjJ4c1FuazZJSGN1YzJOeWIyeHNRbmtzWEc0Z0lDQWdJQ0JsYkdWdFpXNTBVMk55YjJ4c09pQkZiR1Z0Wlc1MExuQnliM1J2ZEhsd1pTNXpZM0p2Ykd3Z2ZId2djMk55YjJ4c1JXeGxiV1Z1ZEN4Y2JpQWdJQ0FnSUhOamNtOXNiRWx1ZEc5V2FXVjNPaUJGYkdWdFpXNTBMbkJ5YjNSdmRIbHdaUzV6WTNKdmJHeEpiblJ2Vm1sbGQxeHVJQ0FnSUgwN1hHNWNiaUFnSUNBdkx5QmtaV1pwYm1VZ2RHbHRhVzVuSUcxbGRHaHZaRnh1SUNBZ0lIWmhjaUJ1YjNjZ1BWeHVJQ0FnSUNBZ2R5NXdaWEptYjNKdFlXNWpaU0FtSmlCM0xuQmxjbVp2Y20xaGJtTmxMbTV2ZDF4dUlDQWdJQ0FnSUNBL0lIY3VjR1Z5Wm05eWJXRnVZMlV1Ym05M0xtSnBibVFvZHk1d1pYSm1iM0p0WVc1alpTbGNiaUFnSUNBZ0lDQWdPaUJFWVhSbExtNXZkenRjYmx4dUlDQWdJQzhxS2x4dUlDQWdJQ0FxSUdsdVpHbGpZWFJsY3lCcFppQmhJSFJvWlNCamRYSnlaVzUwSUdKeWIzZHpaWElnYVhNZ2JXRmtaU0JpZVNCTmFXTnliM052Wm5SY2JpQWdJQ0FnS2lCQWJXVjBhRzlrSUdselRXbGpjbTl6YjJaMFFuSnZkM05sY2x4dUlDQWdJQ0FxSUVCd1lYSmhiU0I3VTNSeWFXNW5mU0IxYzJWeVFXZGxiblJjYmlBZ0lDQWdLaUJBY21WMGRYSnVjeUI3UW05dmJHVmhibjFjYmlBZ0lDQWdLaTljYmlBZ0lDQm1kVzVqZEdsdmJpQnBjMDFwWTNKdmMyOW1kRUp5YjNkelpYSW9kWE5sY2tGblpXNTBLU0I3WEc0Z0lDQWdJQ0IyWVhJZ2RYTmxja0ZuWlc1MFVHRjBkR1Z5Ym5NZ1BTQmJKMDFUU1VVZ0p5d2dKMVJ5YVdSbGJuUXZKeXdnSjBWa1oyVXZKMTA3WEc1Y2JpQWdJQ0FnSUhKbGRIVnliaUJ1WlhjZ1VtVm5SWGh3S0hWelpYSkJaMlZ1ZEZCaGRIUmxjbTV6TG1wdmFXNG9KM3duS1NrdWRHVnpkQ2gxYzJWeVFXZGxiblFwTzF4dUlDQWdJSDFjYmx4dUlDQWdJQzhxWEc0Z0lDQWdJQ29nU1VVZ2FHRnpJSEp2ZFc1a2FXNW5JR0oxWnlCeWIzVnVaR2x1WnlCa2IzZHVJR05zYVdWdWRFaGxhV2RvZENCaGJtUWdZMnhwWlc1MFYybGtkR2dnWVc1a1hHNGdJQ0FnSUNvZ2NtOTFibVJwYm1jZ2RYQWdjMk55YjJ4c1NHVnBaMmgwSUdGdVpDQnpZM0p2Ykd4WGFXUjBhQ0JqWVhWemFXNW5JR1poYkhObElIQnZjMmwwYVhabGMxeHVJQ0FnSUNBcUlHOXVJR2hoYzFOamNtOXNiR0ZpYkdWVGNHRmpaVnh1SUNBZ0lDQXFMMXh1SUNBZ0lIWmhjaUJTVDFWT1JFbE9SMTlVVDB4RlVrRk9RMFVnUFNCcGMwMXBZM0p2YzI5bWRFSnliM2R6WlhJb2R5NXVZWFpwWjJGMGIzSXVkWE5sY2tGblpXNTBLU0EvSURFZ09pQXdPMXh1WEc0Z0lDQWdMeW9xWEc0Z0lDQWdJQ29nWTJoaGJtZGxjeUJ6WTNKdmJHd2djRzl6YVhScGIyNGdhVzV6YVdSbElHRnVJR1ZzWlcxbGJuUmNiaUFnSUNBZ0tpQkFiV1YwYUc5a0lITmpjbTlzYkVWc1pXMWxiblJjYmlBZ0lDQWdLaUJBY0dGeVlXMGdlMDUxYldKbGNuMGdlRnh1SUNBZ0lDQXFJRUJ3WVhKaGJTQjdUblZ0WW1WeWZTQjVYRzRnSUNBZ0lDb2dRSEpsZEhWeWJuTWdlM1Z1WkdWbWFXNWxaSDFjYmlBZ0lDQWdLaTljYmlBZ0lDQm1kVzVqZEdsdmJpQnpZM0p2Ykd4RmJHVnRaVzUwS0hnc0lIa3BJSHRjYmlBZ0lDQWdJSFJvYVhNdWMyTnliMnhzVEdWbWRDQTlJSGc3WEc0Z0lDQWdJQ0IwYUdsekxuTmpjbTlzYkZSdmNDQTlJSGs3WEc0Z0lDQWdmVnh1WEc0Z0lDQWdMeW9xWEc0Z0lDQWdJQ29nY21WMGRYSnVjeUJ5WlhOMWJIUWdiMllnWVhCd2JIbHBibWNnWldGelpTQnRZWFJvSUdaMWJtTjBhVzl1SUhSdklHRWdiblZ0WW1WeVhHNGdJQ0FnSUNvZ1FHMWxkR2h2WkNCbFlYTmxYRzRnSUNBZ0lDb2dRSEJoY21GdElIdE9kVzFpWlhKOUlHdGNiaUFnSUNBZ0tpQkFjbVYwZFhKdWN5QjdUblZ0WW1WeWZWeHVJQ0FnSUNBcUwxeHVJQ0FnSUdaMWJtTjBhVzl1SUdWaGMyVW9heWtnZTF4dUlDQWdJQ0FnY21WMGRYSnVJREF1TlNBcUlDZ3hJQzBnVFdGMGFDNWpiM01vVFdGMGFDNVFTU0FxSUdzcEtUdGNiaUFnSUNCOVhHNWNiaUFnSUNBdktpcGNiaUFnSUNBZ0tpQnBibVJwWTJGMFpYTWdhV1lnWVNCemJXOXZkR2dnWW1Wb1lYWnBiM0lnYzJodmRXeGtJR0psSUdGd2NHeHBaV1JjYmlBZ0lDQWdLaUJBYldWMGFHOWtJSE5vYjNWc1pFSmhhV3hQZFhSY2JpQWdJQ0FnS2lCQWNHRnlZVzBnZTA1MWJXSmxjbnhQWW1wbFkzUjlJR1pwY25OMFFYSm5YRzRnSUNBZ0lDb2dRSEpsZEhWeWJuTWdlMEp2YjJ4bFlXNTlYRzRnSUNBZ0lDb3ZYRzRnSUNBZ1puVnVZM1JwYjI0Z2MyaHZkV3hrUW1GcGJFOTFkQ2htYVhKemRFRnlaeWtnZTF4dUlDQWdJQ0FnYVdZZ0tGeHVJQ0FnSUNBZ0lDQm1hWEp6ZEVGeVp5QTlQVDBnYm5Wc2JDQjhmRnh1SUNBZ0lDQWdJQ0IwZVhCbGIyWWdabWx5YzNSQmNtY2dJVDA5SUNkdlltcGxZM1FuSUh4OFhHNGdJQ0FnSUNBZ0lHWnBjbk4wUVhKbkxtSmxhR0YyYVc5eUlEMDlQU0IxYm1SbFptbHVaV1FnZkh4Y2JpQWdJQ0FnSUNBZ1ptbHljM1JCY21jdVltVm9ZWFpwYjNJZ1BUMDlJQ2RoZFhSdkp5QjhmRnh1SUNBZ0lDQWdJQ0JtYVhKemRFRnlaeTVpWldoaGRtbHZjaUE5UFQwZ0oybHVjM1JoYm5RblhHNGdJQ0FnSUNBcElIdGNiaUFnSUNBZ0lDQWdMeThnWm1seWMzUWdZWEpuZFcxbGJuUWdhWE1nYm05MElHRnVJRzlpYW1WamRDOXVkV3hzWEc0Z0lDQWdJQ0FnSUM4dklHOXlJR0psYUdGMmFXOXlJR2x6SUdGMWRHOHNJR2x1YzNSaGJuUWdiM0lnZFc1a1pXWnBibVZrWEc0Z0lDQWdJQ0FnSUhKbGRIVnliaUIwY25WbE8xeHVJQ0FnSUNBZ2ZWeHVYRzRnSUNBZ0lDQnBaaUFvZEhsd1pXOW1JR1pwY25OMFFYSm5JRDA5UFNBbmIySnFaV04wSnlBbUppQm1hWEp6ZEVGeVp5NWlaV2hoZG1sdmNpQTlQVDBnSjNOdGIyOTBhQ2NwSUh0Y2JpQWdJQ0FnSUNBZ0x5OGdabWx5YzNRZ1lYSm5kVzFsYm5RZ2FYTWdZVzRnYjJKcVpXTjBJR0Z1WkNCaVpXaGhkbWx2Y2lCcGN5QnpiVzl2ZEdoY2JpQWdJQ0FnSUNBZ2NtVjBkWEp1SUdaaGJITmxPMXh1SUNBZ0lDQWdmVnh1WEc0Z0lDQWdJQ0F2THlCMGFISnZkeUJsY25KdmNpQjNhR1Z1SUdKbGFHRjJhVzl5SUdseklHNXZkQ0J6ZFhCd2IzSjBaV1JjYmlBZ0lDQWdJSFJvY205M0lHNWxkeUJVZVhCbFJYSnliM0lvWEc0Z0lDQWdJQ0FnSUNkaVpXaGhkbWx2Y2lCdFpXMWlaWElnYjJZZ1UyTnliMnhzVDNCMGFXOXVjeUFuSUN0Y2JpQWdJQ0FnSUNBZ0lDQm1hWEp6ZEVGeVp5NWlaV2hoZG1sdmNpQXJYRzRnSUNBZ0lDQWdJQ0FnSnlCcGN5QnViM1FnWVNCMllXeHBaQ0IyWVd4MVpTQm1iM0lnWlc1MWJXVnlZWFJwYjI0Z1UyTnliMnhzUW1Wb1lYWnBiM0l1SjF4dUlDQWdJQ0FnS1R0Y2JpQWdJQ0I5WEc1Y2JpQWdJQ0F2S2lwY2JpQWdJQ0FnS2lCcGJtUnBZMkYwWlhNZ2FXWWdZVzRnWld4bGJXVnVkQ0JvWVhNZ2MyTnliMnhzWVdKc1pTQnpjR0ZqWlNCcGJpQjBhR1VnY0hKdmRtbGtaV1FnWVhocGMxeHVJQ0FnSUNBcUlFQnRaWFJvYjJRZ2FHRnpVMk55YjJ4c1lXSnNaVk53WVdObFhHNGdJQ0FnSUNvZ1FIQmhjbUZ0SUh0T2IyUmxmU0JsYkZ4dUlDQWdJQ0FxSUVCd1lYSmhiU0I3VTNSeWFXNW5mU0JoZUdselhHNGdJQ0FnSUNvZ1FISmxkSFZ5Ym5NZ2UwSnZiMnhsWVc1OVhHNGdJQ0FnSUNvdlhHNGdJQ0FnWm5WdVkzUnBiMjRnYUdGelUyTnliMnhzWVdKc1pWTndZV05sS0dWc0xDQmhlR2x6S1NCN1hHNGdJQ0FnSUNCcFppQW9ZWGhwY3lBOVBUMGdKMWtuS1NCN1hHNGdJQ0FnSUNBZ0lISmxkSFZ5YmlCbGJDNWpiR2xsYm5SSVpXbG5hSFFnS3lCU1QxVk9SRWxPUjE5VVQweEZVa0ZPUTBVZ1BDQmxiQzV6WTNKdmJHeElaV2xuYUhRN1hHNGdJQ0FnSUNCOVhHNWNiaUFnSUNBZ0lHbG1JQ2hoZUdseklEMDlQU0FuV0NjcElIdGNiaUFnSUNBZ0lDQWdjbVYwZFhKdUlHVnNMbU5zYVdWdWRGZHBaSFJvSUNzZ1VrOVZUa1JKVGtkZlZFOU1SVkpCVGtORklEd2daV3d1YzJOeWIyeHNWMmxrZEdnN1hHNGdJQ0FnSUNCOVhHNGdJQ0FnZlZ4dVhHNGdJQ0FnTHlvcVhHNGdJQ0FnSUNvZ2FXNWthV05oZEdWeklHbG1JR0Z1SUdWc1pXMWxiblFnYUdGeklHRWdjMk55YjJ4c1lXSnNaU0J2ZG1WeVpteHZkeUJ3Y205d1pYSjBlU0JwYmlCMGFHVWdZWGhwYzF4dUlDQWdJQ0FxSUVCdFpYUm9iMlFnWTJGdVQzWmxjbVpzYjNkY2JpQWdJQ0FnS2lCQWNHRnlZVzBnZTA1dlpHVjlJR1ZzWEc0Z0lDQWdJQ29nUUhCaGNtRnRJSHRUZEhKcGJtZDlJR0Y0YVhOY2JpQWdJQ0FnS2lCQWNtVjBkWEp1Y3lCN1FtOXZiR1ZoYm4xY2JpQWdJQ0FnS2k5Y2JpQWdJQ0JtZFc1amRHbHZiaUJqWVc1UGRtVnlabXh2ZHlobGJDd2dZWGhwY3lrZ2UxeHVJQ0FnSUNBZ2RtRnlJRzkyWlhKbWJHOTNWbUZzZFdVZ1BTQjNMbWRsZEVOdmJYQjFkR1ZrVTNSNWJHVW9aV3dzSUc1MWJHd3BXeWR2ZG1WeVpteHZkeWNnS3lCaGVHbHpYVHRjYmx4dUlDQWdJQ0FnY21WMGRYSnVJRzkyWlhKbWJHOTNWbUZzZFdVZ1BUMDlJQ2RoZFhSdkp5QjhmQ0J2ZG1WeVpteHZkMVpoYkhWbElEMDlQU0FuYzJOeWIyeHNKenRjYmlBZ0lDQjlYRzVjYmlBZ0lDQXZLaXBjYmlBZ0lDQWdLaUJwYm1ScFkyRjBaWE1nYVdZZ1lXNGdaV3hsYldWdWRDQmpZVzRnWW1VZ2MyTnliMnhzWldRZ2FXNGdaV2wwYUdWeUlHRjRhWE5jYmlBZ0lDQWdLaUJBYldWMGFHOWtJR2x6VTJOeWIyeHNZV0pzWlZ4dUlDQWdJQ0FxSUVCd1lYSmhiU0I3VG05a1pYMGdaV3hjYmlBZ0lDQWdLaUJBY0dGeVlXMGdlMU4wY21sdVozMGdZWGhwYzF4dUlDQWdJQ0FxSUVCeVpYUjFjbTV6SUh0Q2IyOXNaV0Z1ZlZ4dUlDQWdJQ0FxTDF4dUlDQWdJR1oxYm1OMGFXOXVJR2x6VTJOeWIyeHNZV0pzWlNobGJDa2dlMXh1SUNBZ0lDQWdkbUZ5SUdselUyTnliMnhzWVdKc1pWa2dQU0JvWVhOVFkzSnZiR3hoWW14bFUzQmhZMlVvWld3c0lDZFpKeWtnSmlZZ1kyRnVUM1psY21ac2IzY29aV3dzSUNkWkp5azdYRzRnSUNBZ0lDQjJZWElnYVhOVFkzSnZiR3hoWW14bFdDQTlJR2hoYzFOamNtOXNiR0ZpYkdWVGNHRmpaU2hsYkN3Z0oxZ25LU0FtSmlCallXNVBkbVZ5Wm14dmR5aGxiQ3dnSjFnbktUdGNibHh1SUNBZ0lDQWdjbVYwZFhKdUlHbHpVMk55YjJ4c1lXSnNaVmtnZkh3Z2FYTlRZM0p2Ykd4aFlteGxXRHRjYmlBZ0lDQjlYRzVjYmlBZ0lDQXZLaXBjYmlBZ0lDQWdLaUJtYVc1a2N5QnpZM0p2Ykd4aFlteGxJSEJoY21WdWRDQnZaaUJoYmlCbGJHVnRaVzUwWEc0Z0lDQWdJQ29nUUcxbGRHaHZaQ0JtYVc1a1UyTnliMnhzWVdKc1pWQmhjbVZ1ZEZ4dUlDQWdJQ0FxSUVCd1lYSmhiU0I3VG05a1pYMGdaV3hjYmlBZ0lDQWdLaUJBY21WMGRYSnVjeUI3VG05a1pYMGdaV3hjYmlBZ0lDQWdLaTljYmlBZ0lDQm1kVzVqZEdsdmJpQm1hVzVrVTJOeWIyeHNZV0pzWlZCaGNtVnVkQ2hsYkNrZ2UxeHVJQ0FnSUNBZ2RtRnlJR2x6UW05a2VUdGNibHh1SUNBZ0lDQWdaRzhnZTF4dUlDQWdJQ0FnSUNCbGJDQTlJR1ZzTG5CaGNtVnVkRTV2WkdVN1hHNWNiaUFnSUNBZ0lDQWdhWE5DYjJSNUlEMGdaV3dnUFQwOUlHUXVZbTlrZVR0Y2JpQWdJQ0FnSUgwZ2QyaHBiR1VnS0dselFtOWtlU0E5UFQwZ1ptRnNjMlVnSmlZZ2FYTlRZM0p2Ykd4aFlteGxLR1ZzS1NBOVBUMGdabUZzYzJVcE8xeHVYRzRnSUNBZ0lDQnBjMEp2WkhrZ1BTQnVkV3hzTzF4dVhHNGdJQ0FnSUNCeVpYUjFjbTRnWld3N1hHNGdJQ0FnZlZ4dVhHNGdJQ0FnTHlvcVhHNGdJQ0FnSUNvZ2MyVnNaaUJwYm5admEyVmtJR1oxYm1OMGFXOXVJSFJvWVhRc0lHZHBkbVZ1SUdFZ1kyOXVkR1Y0ZEN3Z2MzUmxjSE1nZEdoeWIzVm5hQ0J6WTNKdmJHeHBibWRjYmlBZ0lDQWdLaUJBYldWMGFHOWtJSE4wWlhCY2JpQWdJQ0FnS2lCQWNHRnlZVzBnZTA5aWFtVmpkSDBnWTI5dWRHVjRkRnh1SUNBZ0lDQXFJRUJ5WlhSMWNtNXpJSHQxYm1SbFptbHVaV1I5WEc0Z0lDQWdJQ292WEc0Z0lDQWdablZ1WTNScGIyNGdjM1JsY0NoamIyNTBaWGgwS1NCN1hHNGdJQ0FnSUNCMllYSWdkR2x0WlNBOUlHNXZkeWdwTzF4dUlDQWdJQ0FnZG1GeUlIWmhiSFZsTzF4dUlDQWdJQ0FnZG1GeUlHTjFjbkpsYm5SWU8xeHVJQ0FnSUNBZ2RtRnlJR04xY25KbGJuUlpPMXh1SUNBZ0lDQWdkbUZ5SUdWc1lYQnpaV1FnUFNBb2RHbHRaU0F0SUdOdmJuUmxlSFF1YzNSaGNuUlVhVzFsS1NBdklGTkRVazlNVEY5VVNVMUZPMXh1WEc0Z0lDQWdJQ0F2THlCaGRtOXBaQ0JsYkdGd2MyVmtJSFJwYldWeklHaHBaMmhsY2lCMGFHRnVJRzl1WlZ4dUlDQWdJQ0FnWld4aGNITmxaQ0E5SUdWc1lYQnpaV1FnUGlBeElEOGdNU0E2SUdWc1lYQnpaV1E3WEc1Y2JpQWdJQ0FnSUM4dklHRndjR3g1SUdWaGMybHVaeUIwYnlCbGJHRndjMlZrSUhScGJXVmNiaUFnSUNBZ0lIWmhiSFZsSUQwZ1pXRnpaU2hsYkdGd2MyVmtLVHRjYmx4dUlDQWdJQ0FnWTNWeWNtVnVkRmdnUFNCamIyNTBaWGgwTG5OMFlYSjBXQ0FySUNoamIyNTBaWGgwTG5nZ0xTQmpiMjUwWlhoMExuTjBZWEowV0NrZ0tpQjJZV3gxWlR0Y2JpQWdJQ0FnSUdOMWNuSmxiblJaSUQwZ1kyOXVkR1Y0ZEM1emRHRnlkRmtnS3lBb1kyOXVkR1Y0ZEM1NUlDMGdZMjl1ZEdWNGRDNXpkR0Z5ZEZrcElDb2dkbUZzZFdVN1hHNWNiaUFnSUNBZ0lHTnZiblJsZUhRdWJXVjBhRzlrTG1OaGJHd29ZMjl1ZEdWNGRDNXpZM0p2Ykd4aFlteGxMQ0JqZFhKeVpXNTBXQ3dnWTNWeWNtVnVkRmtwTzF4dVhHNGdJQ0FnSUNBdkx5QnpZM0p2Ykd3Z2JXOXlaU0JwWmlCM1pTQm9ZWFpsSUc1dmRDQnlaV0ZqYUdWa0lHOTFjaUJrWlhOMGFXNWhkR2x2Ymx4dUlDQWdJQ0FnYVdZZ0tHTjFjbkpsYm5SWUlDRTlQU0JqYjI1MFpYaDBMbmdnZkh3Z1kzVnljbVZ1ZEZrZ0lUMDlJR052Ym5SbGVIUXVlU2tnZTF4dUlDQWdJQ0FnSUNCM0xuSmxjWFZsYzNSQmJtbHRZWFJwYjI1R2NtRnRaU2h6ZEdWd0xtSnBibVFvZHl3Z1kyOXVkR1Y0ZENrcE8xeHVJQ0FnSUNBZ2ZWeHVJQ0FnSUgxY2JseHVJQ0FnSUM4cUtseHVJQ0FnSUNBcUlITmpjbTlzYkhNZ2QybHVaRzkzSUc5eUlHVnNaVzFsYm5RZ2QybDBhQ0JoSUhOdGIyOTBhQ0JpWldoaGRtbHZjbHh1SUNBZ0lDQXFJRUJ0WlhSb2IyUWdjMjF2YjNSb1UyTnliMnhzWEc0Z0lDQWdJQ29nUUhCaGNtRnRJSHRQWW1wbFkzUjhUbTlrWlgwZ1pXeGNiaUFnSUNBZ0tpQkFjR0Z5WVcwZ2UwNTFiV0psY24wZ2VGeHVJQ0FnSUNBcUlFQndZWEpoYlNCN1RuVnRZbVZ5ZlNCNVhHNGdJQ0FnSUNvZ1FISmxkSFZ5Ym5NZ2UzVnVaR1ZtYVc1bFpIMWNiaUFnSUNBZ0tpOWNiaUFnSUNCbWRXNWpkR2x2YmlCemJXOXZkR2hUWTNKdmJHd29aV3dzSUhnc0lIa3BJSHRjYmlBZ0lDQWdJSFpoY2lCelkzSnZiR3hoWW14bE8xeHVJQ0FnSUNBZ2RtRnlJSE4wWVhKMFdEdGNiaUFnSUNBZ0lIWmhjaUJ6ZEdGeWRGazdYRzRnSUNBZ0lDQjJZWElnYldWMGFHOWtPMXh1SUNBZ0lDQWdkbUZ5SUhOMFlYSjBWR2x0WlNBOUlHNXZkeWdwTzF4dVhHNGdJQ0FnSUNBdkx5QmtaV1pwYm1VZ2MyTnliMnhzSUdOdmJuUmxlSFJjYmlBZ0lDQWdJR2xtSUNobGJDQTlQVDBnWkM1aWIyUjVLU0I3WEc0Z0lDQWdJQ0FnSUhOamNtOXNiR0ZpYkdVZ1BTQjNPMXh1SUNBZ0lDQWdJQ0J6ZEdGeWRGZ2dQU0IzTG5OamNtOXNiRmdnZkh3Z2R5NXdZV2RsV0U5bVpuTmxkRHRjYmlBZ0lDQWdJQ0FnYzNSaGNuUlpJRDBnZHk1elkzSnZiR3haSUh4OElIY3VjR0ZuWlZsUFptWnpaWFE3WEc0Z0lDQWdJQ0FnSUcxbGRHaHZaQ0E5SUc5eWFXZHBibUZzTG5OamNtOXNiRHRjYmlBZ0lDQWdJSDBnWld4elpTQjdYRzRnSUNBZ0lDQWdJSE5qY205c2JHRmliR1VnUFNCbGJEdGNiaUFnSUNBZ0lDQWdjM1JoY25SWUlEMGdaV3d1YzJOeWIyeHNUR1ZtZER0Y2JpQWdJQ0FnSUNBZ2MzUmhjblJaSUQwZ1pXd3VjMk55YjJ4c1ZHOXdPMXh1SUNBZ0lDQWdJQ0J0WlhSb2IyUWdQU0J6WTNKdmJHeEZiR1Z0Wlc1ME8xeHVJQ0FnSUNBZ2ZWeHVYRzRnSUNBZ0lDQXZMeUJ6WTNKdmJHd2diRzl2Y0dsdVp5QnZkbVZ5SUdFZ1puSmhiV1ZjYmlBZ0lDQWdJSE4wWlhBb2UxeHVJQ0FnSUNBZ0lDQnpZM0p2Ykd4aFlteGxPaUJ6WTNKdmJHeGhZbXhsTEZ4dUlDQWdJQ0FnSUNCdFpYUm9iMlE2SUcxbGRHaHZaQ3hjYmlBZ0lDQWdJQ0FnYzNSaGNuUlVhVzFsT2lCemRHRnlkRlJwYldVc1hHNGdJQ0FnSUNBZ0lITjBZWEowV0RvZ2MzUmhjblJZTEZ4dUlDQWdJQ0FnSUNCemRHRnlkRms2SUhOMFlYSjBXU3hjYmlBZ0lDQWdJQ0FnZURvZ2VDeGNiaUFnSUNBZ0lDQWdlVG9nZVZ4dUlDQWdJQ0FnZlNrN1hHNGdJQ0FnZlZ4dVhHNGdJQ0FnTHk4Z1QxSkpSMGxPUVV3Z1RVVlVTRTlFVXlCUFZrVlNVa2xFUlZOY2JpQWdJQ0F2THlCM0xuTmpjbTlzYkNCaGJtUWdkeTV6WTNKdmJHeFViMXh1SUNBZ0lIY3VjMk55YjJ4c0lEMGdkeTV6WTNKdmJHeFVieUE5SUdaMWJtTjBhVzl1S0NrZ2UxeHVJQ0FnSUNBZ0x5OGdZWFp2YVdRZ1lXTjBhVzl1SUhkb1pXNGdibThnWVhKbmRXMWxiblJ6SUdGeVpTQndZWE56WldSY2JpQWdJQ0FnSUdsbUlDaGhjbWQxYldWdWRITmJNRjBnUFQwOUlIVnVaR1ZtYVc1bFpDa2dlMXh1SUNBZ0lDQWdJQ0J5WlhSMWNtNDdYRzRnSUNBZ0lDQjlYRzVjYmlBZ0lDQWdJQzh2SUdGMmIybGtJSE50YjI5MGFDQmlaV2hoZG1sdmNpQnBaaUJ1YjNRZ2NtVnhkV2x5WldSY2JpQWdJQ0FnSUdsbUlDaHphRzkxYkdSQ1lXbHNUM1YwS0dGeVozVnRaVzUwYzFzd1hTa2dQVDA5SUhSeWRXVXBJSHRjYmlBZ0lDQWdJQ0FnYjNKcFoybHVZV3d1YzJOeWIyeHNMbU5oYkd3b1hHNGdJQ0FnSUNBZ0lDQWdkeXhjYmlBZ0lDQWdJQ0FnSUNCaGNtZDFiV1Z1ZEhOYk1GMHViR1ZtZENBaFBUMGdkVzVrWldacGJtVmtYRzRnSUNBZ0lDQWdJQ0FnSUNBL0lHRnlaM1Z0Wlc1MGMxc3dYUzVzWldaMFhHNGdJQ0FnSUNBZ0lDQWdJQ0E2SUhSNWNHVnZaaUJoY21kMWJXVnVkSE5iTUYwZ0lUMDlJQ2R2WW1wbFkzUW5YRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lEOGdZWEpuZFcxbGJuUnpXekJkWEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJRG9nZHk1elkzSnZiR3hZSUh4OElIY3VjR0ZuWlZoUFptWnpaWFFzWEc0Z0lDQWdJQ0FnSUNBZ0x5OGdkWE5sSUhSdmNDQndjbTl3TENCelpXTnZibVFnWVhKbmRXMWxiblFnYVdZZ2NISmxjMlZ1ZENCdmNpQm1ZV3hzWW1GamF5QjBieUJ6WTNKdmJHeFpYRzRnSUNBZ0lDQWdJQ0FnWVhKbmRXMWxiblJ6V3pCZExuUnZjQ0FoUFQwZ2RXNWtaV1pwYm1Wa1hHNGdJQ0FnSUNBZ0lDQWdJQ0EvSUdGeVozVnRaVzUwYzFzd1hTNTBiM0JjYmlBZ0lDQWdJQ0FnSUNBZ0lEb2dZWEpuZFcxbGJuUnpXekZkSUNFOVBTQjFibVJsWm1sdVpXUmNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ1B5QmhjbWQxYldWdWRITmJNVjFjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdPaUIzTG5OamNtOXNiRmtnZkh3Z2R5NXdZV2RsV1U5bVpuTmxkRnh1SUNBZ0lDQWdJQ0FwTzF4dVhHNGdJQ0FnSUNBZ0lISmxkSFZ5Ymp0Y2JpQWdJQ0FnSUgxY2JseHVJQ0FnSUNBZ0x5OGdURVZVSUZSSVJTQlRUVTlQVkVoT1JWTlRJRUpGUjBsT0lWeHVJQ0FnSUNBZ2MyMXZiM1JvVTJOeWIyeHNMbU5oYkd3b1hHNGdJQ0FnSUNBZ0lIY3NYRzRnSUNBZ0lDQWdJR1F1WW05a2VTeGNiaUFnSUNBZ0lDQWdZWEpuZFcxbGJuUnpXekJkTG14bFpuUWdJVDA5SUhWdVpHVm1hVzVsWkZ4dUlDQWdJQ0FnSUNBZ0lEOGdmbjVoY21kMWJXVnVkSE5iTUYwdWJHVm1kRnh1SUNBZ0lDQWdJQ0FnSURvZ2R5NXpZM0p2Ykd4WUlIeDhJSGN1Y0dGblpWaFBabVp6WlhRc1hHNGdJQ0FnSUNBZ0lHRnlaM1Z0Wlc1MGMxc3dYUzUwYjNBZ0lUMDlJSFZ1WkdWbWFXNWxaRnh1SUNBZ0lDQWdJQ0FnSUQ4Z2ZuNWhjbWQxYldWdWRITmJNRjB1ZEc5d1hHNGdJQ0FnSUNBZ0lDQWdPaUIzTG5OamNtOXNiRmtnZkh3Z2R5NXdZV2RsV1U5bVpuTmxkRnh1SUNBZ0lDQWdLVHRjYmlBZ0lDQjlPMXh1WEc0Z0lDQWdMeThnZHk1elkzSnZiR3hDZVZ4dUlDQWdJSGN1YzJOeWIyeHNRbmtnUFNCbWRXNWpkR2x2YmlncElIdGNiaUFnSUNBZ0lDOHZJR0YyYjJsa0lHRmpkR2x2YmlCM2FHVnVJRzV2SUdGeVozVnRaVzUwY3lCaGNtVWdjR0Z6YzJWa1hHNGdJQ0FnSUNCcFppQW9ZWEpuZFcxbGJuUnpXekJkSUQwOVBTQjFibVJsWm1sdVpXUXBJSHRjYmlBZ0lDQWdJQ0FnY21WMGRYSnVPMXh1SUNBZ0lDQWdmVnh1WEc0Z0lDQWdJQ0F2THlCaGRtOXBaQ0J6Ylc5dmRHZ2dZbVZvWVhacGIzSWdhV1lnYm05MElISmxjWFZwY21Wa1hHNGdJQ0FnSUNCcFppQW9jMmh2ZFd4a1FtRnBiRTkxZENoaGNtZDFiV1Z1ZEhOYk1GMHBLU0I3WEc0Z0lDQWdJQ0FnSUc5eWFXZHBibUZzTG5OamNtOXNiRUo1TG1OaGJHd29YRzRnSUNBZ0lDQWdJQ0FnZHl4Y2JpQWdJQ0FnSUNBZ0lDQmhjbWQxYldWdWRITmJNRjB1YkdWbWRDQWhQVDBnZFc1a1pXWnBibVZrWEc0Z0lDQWdJQ0FnSUNBZ0lDQS9JR0Z5WjNWdFpXNTBjMXN3WFM1c1pXWjBYRzRnSUNBZ0lDQWdJQ0FnSUNBNklIUjVjR1Z2WmlCaGNtZDFiV1Z1ZEhOYk1GMGdJVDA5SUNkdlltcGxZM1FuSUQ4Z1lYSm5kVzFsYm5Seld6QmRJRG9nTUN4Y2JpQWdJQ0FnSUNBZ0lDQmhjbWQxYldWdWRITmJNRjB1ZEc5d0lDRTlQU0IxYm1SbFptbHVaV1JjYmlBZ0lDQWdJQ0FnSUNBZ0lEOGdZWEpuZFcxbGJuUnpXekJkTG5SdmNGeHVJQ0FnSUNBZ0lDQWdJQ0FnT2lCaGNtZDFiV1Z1ZEhOYk1WMGdJVDA5SUhWdVpHVm1hVzVsWkNBL0lHRnlaM1Z0Wlc1MGMxc3hYU0E2SURCY2JpQWdJQ0FnSUNBZ0tUdGNibHh1SUNBZ0lDQWdJQ0J5WlhSMWNtNDdYRzRnSUNBZ0lDQjlYRzVjYmlBZ0lDQWdJQzh2SUV4RlZDQlVTRVVnVTAxUFQxUklUa1ZUVXlCQ1JVZEpUaUZjYmlBZ0lDQWdJSE50YjI5MGFGTmpjbTlzYkM1allXeHNLRnh1SUNBZ0lDQWdJQ0IzTEZ4dUlDQWdJQ0FnSUNCa0xtSnZaSGtzWEc0Z0lDQWdJQ0FnSUg1K1lYSm5kVzFsYm5Seld6QmRMbXhsWm5RZ0t5QW9keTV6WTNKdmJHeFlJSHg4SUhjdWNHRm5aVmhQWm1aelpYUXBMRnh1SUNBZ0lDQWdJQ0IrZm1GeVozVnRaVzUwYzFzd1hTNTBiM0FnS3lBb2R5NXpZM0p2Ykd4WklIeDhJSGN1Y0dGblpWbFBabVp6WlhRcFhHNGdJQ0FnSUNBcE8xeHVJQ0FnSUgwN1hHNWNiaUFnSUNBdkx5QkZiR1Z0Wlc1MExuQnliM1J2ZEhsd1pTNXpZM0p2Ykd3Z1lXNWtJRVZzWlcxbGJuUXVjSEp2ZEc5MGVYQmxMbk5qY205c2JGUnZYRzRnSUNBZ1JXeGxiV1Z1ZEM1d2NtOTBiM1I1Y0dVdWMyTnliMnhzSUQwZ1JXeGxiV1Z1ZEM1d2NtOTBiM1I1Y0dVdWMyTnliMnhzVkc4Z1BTQm1kVzVqZEdsdmJpZ3BJSHRjYmlBZ0lDQWdJQzh2SUdGMmIybGtJR0ZqZEdsdmJpQjNhR1Z1SUc1dklHRnlaM1Z0Wlc1MGN5QmhjbVVnY0dGemMyVmtYRzRnSUNBZ0lDQnBaaUFvWVhKbmRXMWxiblJ6V3pCZElEMDlQU0IxYm1SbFptbHVaV1FwSUh0Y2JpQWdJQ0FnSUNBZ2NtVjBkWEp1TzF4dUlDQWdJQ0FnZlZ4dVhHNGdJQ0FnSUNBdkx5QmhkbTlwWkNCemJXOXZkR2dnWW1Wb1lYWnBiM0lnYVdZZ2JtOTBJSEpsY1hWcGNtVmtYRzRnSUNBZ0lDQnBaaUFvYzJodmRXeGtRbUZwYkU5MWRDaGhjbWQxYldWdWRITmJNRjBwSUQwOVBTQjBjblZsS1NCN1hHNGdJQ0FnSUNBZ0lDOHZJR2xtSUc5dVpTQnVkVzFpWlhJZ2FYTWdjR0Z6YzJWa0xDQjBhSEp2ZHlCbGNuSnZjaUIwYnlCdFlYUmphQ0JHYVhKbFptOTRJR2x0Y0d4bGJXVnVkR0YwYVc5dVhHNGdJQ0FnSUNBZ0lHbG1JQ2gwZVhCbGIyWWdZWEpuZFcxbGJuUnpXekJkSUQwOVBTQW5iblZ0WW1WeUp5QW1KaUJoY21kMWJXVnVkSE5iTVYwZ1BUMDlJSFZ1WkdWbWFXNWxaQ2tnZTF4dUlDQWdJQ0FnSUNBZ0lIUm9jbTkzSUc1bGR5QlRlVzUwWVhoRmNuSnZjaWduVm1Gc2RXVWdZMjkxYkdRZ2JtOTBJR0psSUdOdmJuWmxjblJsWkNjcE8xeHVJQ0FnSUNBZ0lDQjlYRzVjYmlBZ0lDQWdJQ0FnYjNKcFoybHVZV3d1Wld4bGJXVnVkRk5qY205c2JDNWpZV3hzS0Z4dUlDQWdJQ0FnSUNBZ0lIUm9hWE1zWEc0Z0lDQWdJQ0FnSUNBZ0x5OGdkWE5sSUd4bFpuUWdjSEp2Y0N3Z1ptbHljM1FnYm5WdFltVnlJR0Z5WjNWdFpXNTBJRzl5SUdaaGJHeGlZV05ySUhSdklITmpjbTlzYkV4bFpuUmNiaUFnSUNBZ0lDQWdJQ0JoY21kMWJXVnVkSE5iTUYwdWJHVm1kQ0FoUFQwZ2RXNWtaV1pwYm1Wa1hHNGdJQ0FnSUNBZ0lDQWdJQ0EvSUg1K1lYSm5kVzFsYm5Seld6QmRMbXhsWm5SY2JpQWdJQ0FnSUNBZ0lDQWdJRG9nZEhsd1pXOW1JR0Z5WjNWdFpXNTBjMXN3WFNBaFBUMGdKMjlpYW1WamRDY2dQeUIrZm1GeVozVnRaVzUwYzFzd1hTQTZJSFJvYVhNdWMyTnliMnhzVEdWbWRDeGNiaUFnSUNBZ0lDQWdJQ0F2THlCMWMyVWdkRzl3SUhCeWIzQXNJSE5sWTI5dVpDQmhjbWQxYldWdWRDQnZjaUJtWVd4c1ltRmpheUIwYnlCelkzSnZiR3hVYjNCY2JpQWdJQ0FnSUNBZ0lDQmhjbWQxYldWdWRITmJNRjB1ZEc5d0lDRTlQU0IxYm1SbFptbHVaV1JjYmlBZ0lDQWdJQ0FnSUNBZ0lEOGdmbjVoY21kMWJXVnVkSE5iTUYwdWRHOXdYRzRnSUNBZ0lDQWdJQ0FnSUNBNklHRnlaM1Z0Wlc1MGMxc3hYU0FoUFQwZ2RXNWtaV1pwYm1Wa0lEOGdmbjVoY21kMWJXVnVkSE5iTVYwZ09pQjBhR2x6TG5OamNtOXNiRlJ2Y0Z4dUlDQWdJQ0FnSUNBcE8xeHVYRzRnSUNBZ0lDQWdJSEpsZEhWeWJqdGNiaUFnSUNBZ0lIMWNibHh1SUNBZ0lDQWdkbUZ5SUd4bFpuUWdQU0JoY21kMWJXVnVkSE5iTUYwdWJHVm1kRHRjYmlBZ0lDQWdJSFpoY2lCMGIzQWdQU0JoY21kMWJXVnVkSE5iTUYwdWRHOXdPMXh1WEc0Z0lDQWdJQ0F2THlCTVJWUWdWRWhGSUZOTlQwOVVTRTVGVTFNZ1FrVkhTVTRoWEc0Z0lDQWdJQ0J6Ylc5dmRHaFRZM0p2Ykd3dVkyRnNiQ2hjYmlBZ0lDQWdJQ0FnZEdocGN5eGNiaUFnSUNBZ0lDQWdkR2hwY3l4Y2JpQWdJQ0FnSUNBZ2RIbHdaVzltSUd4bFpuUWdQVDA5SUNkMWJtUmxabWx1WldRbklEOGdkR2hwY3k1elkzSnZiR3hNWldaMElEb2dmbjVzWldaMExGeHVJQ0FnSUNBZ0lDQjBlWEJsYjJZZ2RHOXdJRDA5UFNBbmRXNWtaV1pwYm1Wa0p5QS9JSFJvYVhNdWMyTnliMnhzVkc5d0lEb2dmbjUwYjNCY2JpQWdJQ0FnSUNrN1hHNGdJQ0FnZlR0Y2JseHVJQ0FnSUM4dklFVnNaVzFsYm5RdWNISnZkRzkwZVhCbExuTmpjbTlzYkVKNVhHNGdJQ0FnUld4bGJXVnVkQzV3Y205MGIzUjVjR1V1YzJOeWIyeHNRbmtnUFNCbWRXNWpkR2x2YmlncElIdGNiaUFnSUNBZ0lDOHZJR0YyYjJsa0lHRmpkR2x2YmlCM2FHVnVJRzV2SUdGeVozVnRaVzUwY3lCaGNtVWdjR0Z6YzJWa1hHNGdJQ0FnSUNCcFppQW9ZWEpuZFcxbGJuUnpXekJkSUQwOVBTQjFibVJsWm1sdVpXUXBJSHRjYmlBZ0lDQWdJQ0FnY21WMGRYSnVPMXh1SUNBZ0lDQWdmVnh1WEc0Z0lDQWdJQ0F2THlCaGRtOXBaQ0J6Ylc5dmRHZ2dZbVZvWVhacGIzSWdhV1lnYm05MElISmxjWFZwY21Wa1hHNGdJQ0FnSUNCcFppQW9jMmh2ZFd4a1FtRnBiRTkxZENoaGNtZDFiV1Z1ZEhOYk1GMHBJRDA5UFNCMGNuVmxLU0I3WEc0Z0lDQWdJQ0FnSUc5eWFXZHBibUZzTG1Wc1pXMWxiblJUWTNKdmJHd3VZMkZzYkNoY2JpQWdJQ0FnSUNBZ0lDQjBhR2x6TEZ4dUlDQWdJQ0FnSUNBZ0lHRnlaM1Z0Wlc1MGMxc3dYUzVzWldaMElDRTlQU0IxYm1SbFptbHVaV1JjYmlBZ0lDQWdJQ0FnSUNBZ0lEOGdmbjVoY21kMWJXVnVkSE5iTUYwdWJHVm1kQ0FySUhSb2FYTXVjMk55YjJ4c1RHVm1kRnh1SUNBZ0lDQWdJQ0FnSUNBZ09pQitmbUZ5WjNWdFpXNTBjMXN3WFNBcklIUm9hWE11YzJOeWIyeHNUR1ZtZEN4Y2JpQWdJQ0FnSUNBZ0lDQmhjbWQxYldWdWRITmJNRjB1ZEc5d0lDRTlQU0IxYm1SbFptbHVaV1JjYmlBZ0lDQWdJQ0FnSUNBZ0lEOGdmbjVoY21kMWJXVnVkSE5iTUYwdWRHOXdJQ3NnZEdocGN5NXpZM0p2Ykd4VWIzQmNiaUFnSUNBZ0lDQWdJQ0FnSURvZ2ZuNWhjbWQxYldWdWRITmJNVjBnS3lCMGFHbHpMbk5qY205c2JGUnZjRnh1SUNBZ0lDQWdJQ0FwTzF4dVhHNGdJQ0FnSUNBZ0lISmxkSFZ5Ymp0Y2JpQWdJQ0FnSUgxY2JseHVJQ0FnSUNBZ2RHaHBjeTV6WTNKdmJHd29lMXh1SUNBZ0lDQWdJQ0JzWldaME9pQitmbUZ5WjNWdFpXNTBjMXN3WFM1c1pXWjBJQ3NnZEdocGN5NXpZM0p2Ykd4TVpXWjBMRnh1SUNBZ0lDQWdJQ0IwYjNBNklINStZWEpuZFcxbGJuUnpXekJkTG5SdmNDQXJJSFJvYVhNdWMyTnliMnhzVkc5d0xGeHVJQ0FnSUNBZ0lDQmlaV2hoZG1sdmNqb2dZWEpuZFcxbGJuUnpXekJkTG1KbGFHRjJhVzl5WEc0Z0lDQWdJQ0I5S1R0Y2JpQWdJQ0I5TzF4dVhHNGdJQ0FnTHk4Z1JXeGxiV1Z1ZEM1d2NtOTBiM1I1Y0dVdWMyTnliMnhzU1c1MGIxWnBaWGRjYmlBZ0lDQkZiR1Z0Wlc1MExuQnliM1J2ZEhsd1pTNXpZM0p2Ykd4SmJuUnZWbWxsZHlBOUlHWjFibU4wYVc5dUtDa2dlMXh1SUNBZ0lDQWdMeThnWVhadmFXUWdjMjF2YjNSb0lHSmxhR0YyYVc5eUlHbG1JRzV2ZENCeVpYRjFhWEpsWkZ4dUlDQWdJQ0FnYVdZZ0tITm9iM1ZzWkVKaGFXeFBkWFFvWVhKbmRXMWxiblJ6V3pCZEtTQTlQVDBnZEhKMVpTa2dlMXh1SUNBZ0lDQWdJQ0J2Y21sbmFXNWhiQzV6WTNKdmJHeEpiblJ2Vm1sbGR5NWpZV3hzS0Z4dUlDQWdJQ0FnSUNBZ0lIUm9hWE1zWEc0Z0lDQWdJQ0FnSUNBZ1lYSm5kVzFsYm5Seld6QmRJRDA5UFNCMWJtUmxabWx1WldRZ1B5QjBjblZsSURvZ1lYSm5kVzFsYm5Seld6QmRYRzRnSUNBZ0lDQWdJQ2s3WEc1Y2JpQWdJQ0FnSUNBZ2NtVjBkWEp1TzF4dUlDQWdJQ0FnZlZ4dVhHNGdJQ0FnSUNBdkx5Qk1SVlFnVkVoRklGTk5UMDlVU0U1RlUxTWdRa1ZIU1U0aFhHNGdJQ0FnSUNCMllYSWdjMk55YjJ4c1lXSnNaVkJoY21WdWRDQTlJR1pwYm1SVFkzSnZiR3hoWW14bFVHRnlaVzUwS0hSb2FYTXBPMXh1SUNBZ0lDQWdkbUZ5SUhCaGNtVnVkRkpsWTNSeklEMGdjMk55YjJ4c1lXSnNaVkJoY21WdWRDNW5aWFJDYjNWdVpHbHVaME5zYVdWdWRGSmxZM1FvS1R0Y2JpQWdJQ0FnSUhaaGNpQmpiR2xsYm5SU1pXTjBjeUE5SUhSb2FYTXVaMlYwUW05MWJtUnBibWREYkdsbGJuUlNaV04wS0NrN1hHNWNiaUFnSUNBZ0lHbG1JQ2h6WTNKdmJHeGhZbXhsVUdGeVpXNTBJQ0U5UFNCa0xtSnZaSGtwSUh0Y2JpQWdJQ0FnSUNBZ0x5OGdjbVYyWldGc0lHVnNaVzFsYm5RZ2FXNXphV1JsSUhCaGNtVnVkRnh1SUNBZ0lDQWdJQ0J6Ylc5dmRHaFRZM0p2Ykd3dVkyRnNiQ2hjYmlBZ0lDQWdJQ0FnSUNCMGFHbHpMRnh1SUNBZ0lDQWdJQ0FnSUhOamNtOXNiR0ZpYkdWUVlYSmxiblFzWEc0Z0lDQWdJQ0FnSUNBZ2MyTnliMnhzWVdKc1pWQmhjbVZ1ZEM1elkzSnZiR3hNWldaMElDc2dZMnhwWlc1MFVtVmpkSE11YkdWbWRDQXRJSEJoY21WdWRGSmxZM1J6TG14bFpuUXNYRzRnSUNBZ0lDQWdJQ0FnYzJOeWIyeHNZV0pzWlZCaGNtVnVkQzV6WTNKdmJHeFViM0FnS3lCamJHbGxiblJTWldOMGN5NTBiM0FnTFNCd1lYSmxiblJTWldOMGN5NTBiM0JjYmlBZ0lDQWdJQ0FnS1R0Y2JseHVJQ0FnSUNBZ0lDQXZMeUJ5WlhabFlXd2djR0Z5Wlc1MElHbHVJSFpwWlhkd2IzSjBJSFZ1YkdWemN5QnBjeUJtYVhobFpGeHVJQ0FnSUNBZ0lDQnBaaUFvZHk1blpYUkRiMjF3ZFhSbFpGTjBlV3hsS0hOamNtOXNiR0ZpYkdWUVlYSmxiblFwTG5CdmMybDBhVzl1SUNFOVBTQW5abWw0WldRbktTQjdYRzRnSUNBZ0lDQWdJQ0FnZHk1elkzSnZiR3hDZVNoN1hHNGdJQ0FnSUNBZ0lDQWdJQ0JzWldaME9pQndZWEpsYm5SU1pXTjBjeTVzWldaMExGeHVJQ0FnSUNBZ0lDQWdJQ0FnZEc5d09pQndZWEpsYm5SU1pXTjBjeTUwYjNBc1hHNGdJQ0FnSUNBZ0lDQWdJQ0JpWldoaGRtbHZjam9nSjNOdGIyOTBhQ2RjYmlBZ0lDQWdJQ0FnSUNCOUtUdGNiaUFnSUNBZ0lDQWdmVnh1SUNBZ0lDQWdmU0JsYkhObElIdGNiaUFnSUNBZ0lDQWdMeThnY21WMlpXRnNJR1ZzWlcxbGJuUWdhVzRnZG1sbGQzQnZjblJjYmlBZ0lDQWdJQ0FnZHk1elkzSnZiR3hDZVNoN1hHNGdJQ0FnSUNBZ0lDQWdiR1ZtZERvZ1kyeHBaVzUwVW1WamRITXViR1ZtZEN4Y2JpQWdJQ0FnSUNBZ0lDQjBiM0E2SUdOc2FXVnVkRkpsWTNSekxuUnZjQ3hjYmlBZ0lDQWdJQ0FnSUNCaVpXaGhkbWx2Y2pvZ0ozTnRiMjkwYUNkY2JpQWdJQ0FnSUNBZ2ZTazdYRzRnSUNBZ0lDQjlYRzRnSUNBZ2ZUdGNiaUFnZlZ4dVhHNGdJR2xtSUNoMGVYQmxiMllnWlhod2IzSjBjeUE5UFQwZ0oyOWlhbVZqZENjZ0ppWWdkSGx3Wlc5bUlHMXZaSFZzWlNBaFBUMGdKM1Z1WkdWbWFXNWxaQ2NwSUh0Y2JpQWdJQ0F2THlCamIyMXRiMjVxYzF4dUlDQWdJRzF2WkhWc1pTNWxlSEJ2Y25SeklEMGdleUJ3YjJ4NVptbHNiRG9nY0c5c2VXWnBiR3dnZlR0Y2JpQWdmU0JsYkhObElIdGNiaUFnSUNBdkx5Qm5iRzlpWVd4Y2JpQWdJQ0J3YjJ4NVptbHNiQ2dwTzF4dUlDQjlYRzVjYm4wb0tTazdYRzRpTENKamIyNXpkQ0JoY25ScFkyeGxWR1Z0Y0d4aGRHVWdQU0JnWEc1Y2REeGhjblJwWTJ4bElHTnNZWE56UFZ3aVlYSjBhV05zWlY5ZmIzVjBaWEpjSWo1Y2JseDBYSFE4WkdsMklHTnNZWE56UFZ3aVlYSjBhV05zWlY5ZmFXNXVaWEpjSWo1Y2JseDBYSFJjZER4a2FYWWdZMnhoYzNNOVhDSmhjblJwWTJ4bFgxOW9aV0ZrYVc1blhDSStYRzVjZEZ4MFhIUmNkRHhoSUdOc1lYTnpQVndpYW5NdFpXNTBjbmt0ZEdsMGJHVmNJajQ4TDJFK1hHNWNkRngwWEhSY2REeG9NaUJqYkdGemN6MWNJbUZ5ZEdsamJHVXRhR1ZoWkdsdVoxOWZkR2wwYkdWY0lqNDhMMmd5UGx4dVhIUmNkRngwWEhROFpHbDJJR05zWVhOelBWd2lZWEowYVdOc1pTMW9aV0ZrYVc1blgxOXVZVzFsWENJK1hHNWNkRngwWEhSY2RGeDBQSE53WVc0Z1kyeGhjM005WENKaGNuUnBZMnhsTFdobFlXUnBibWRmWDI1aGJXVXRMV1pwY25OMFhDSStQQzl6Y0dGdVBseHVYSFJjZEZ4MFhIUmNkRHhoSUdOc1lYTnpQVndpYW5NdFpXNTBjbmt0WVhKMGFYTjBYQ0krUEM5aFBseHVYSFJjZEZ4MFhIUmNkRHh6Y0dGdUlHTnNZWE56UFZ3aVlYSjBhV05zWlMxb1pXRmthVzVuWDE5dVlXMWxMUzFzWVhOMFhDSStQQzl6Y0dGdVBseHVYSFJjZEZ4MFhIUThMMlJwZGo1Y2JseDBYSFJjZER3dlpHbDJQbHgwWEc1Y2RGeDBYSFE4WkdsMklHTnNZWE56UFZ3aVlYSjBhV05zWlY5ZmMyeHBaR1Z5TFc5MWRHVnlYQ0krWEc1Y2RGeDBYSFJjZER4a2FYWWdZMnhoYzNNOVhDSmhjblJwWTJ4bFgxOXpiR2xrWlhJdGFXNXVaWEpjSWo0OEwyUnBkajVjYmx4MFhIUmNkRngwUEdScGRpQmpiR0Z6Y3oxY0ltRnlkR2xqYkdWZlgzTmpjbTlzYkMxamIyNTBjbTlzYzF3aVBseHVYSFJjZEZ4MFhIUmNkRHh6Y0dGdUlHTnNZWE56UFZ3aVkyOXVkSEp2YkhNZ1lYSnliM2N0Y0hKbGRsd2lQdUtHa0R3dmMzQmhiajRnWEc1Y2RGeDBYSFJjZEZ4MFBITndZVzRnWTJ4aGMzTTlYQ0pqYjI1MGNtOXNjeUJoY25KdmR5MXVaWGgwWENJKzRvYVNQQzl6Y0dGdVBseHVYSFJjZEZ4MFhIUThMMlJwZGo1Y2JseDBYSFJjZEZ4MFBIQWdZMnhoYzNNOVhDSnFjeTFoY25ScFkyeGxMV0Z1WTJodmNpMTBZWEpuWlhSY0lqNDhMM0ErWEc1Y2RGeDBQQzlrYVhZK1hHNWNkRHd2WVhKMGFXTnNaVDVjYm1BN1hHNWNibVY0Y0c5eWRDQmtaV1poZFd4MElHRnlkR2xqYkdWVVpXMXdiR0YwWlRzaUxDSnBiWEJ2Y25RZ2MyMXZiM1JvYzJOeWIyeHNJR1p5YjIwZ0ozTnRiMjkwYUhOamNtOXNiQzF3YjJ4NVptbHNiQ2M3WEc1Y2JtbHRjRzl5ZENCdVlYWk1aeUJtY205dElDY3VMMjVoZGkxc1p5YzdYRzVwYlhCdmNuUWdZWEowYVdOc1pWUmxiWEJzWVhSbElHWnliMjBnSnk0dllYSjBhV05zWlMxMFpXMXdiR0YwWlNjN1hHNWNibHh1WTI5dWMzUWdSRUlnUFNBbmFIUjBjSE02THk5dVpYaDFjeTFqWVhSaGJHOW5MbVpwY21WaVlYTmxhVzh1WTI5dEwzQnZjM1J6TG1wemIyNC9ZWFYwYUQwM1p6ZHdlVXRMZVd0T00wNDFaWGR5U1cxb1QyRlROblozY2taell6Vm1TMnR5YXpobGFucG1KenRjYm1OdmJuTjBJR0ZzY0doaFltVjBJRDBnV3lkaEp5d2dKMkluTENBbll5Y3NJQ2RrSnl3Z0oyVW5MQ0FuWmljc0lDZG5KeXdnSjJnbkxDQW5hU2NzSUNkcUp5d2dKMnNuTENBbmJDY3NJQ2R0Snl3Z0oyNG5MQ0FuYnljc0lDZHdKeXdnSjNJbkxDQW5jeWNzSUNkMEp5d2dKM1VuTENBbmRpY3NJQ2QzSnl3Z0oza25MQ0FuZWlkZE8xeHVYRzVqYjI1emRDQWtiRzloWkdsdVp5QTlJRUZ5Y21GNUxtWnliMjBvWkc5amRXMWxiblF1Y1hWbGNubFRaV3hsWTNSdmNrRnNiQ2duTG14dllXUnBibWNuS1NrN1hHNWpiMjV6ZENBa2JtRjJJRDBnWkc5amRXMWxiblF1WjJWMFJXeGxiV1Z1ZEVKNVNXUW9KMnB6TFc1aGRpY3BPMXh1WTI5dWMzUWdKSEJoY21Gc2JHRjRJRDBnWkc5amRXMWxiblF1Y1hWbGNubFRaV3hsWTNSdmNpZ25MbkJoY21Gc2JHRjRKeWs3WEc1amIyNXpkQ0FrWTI5dWRHVnVkQ0E5SUdSdlkzVnRaVzUwTG5GMVpYSjVVMlZzWldOMGIzSW9KeTVqYjI1MFpXNTBKeWs3WEc1amIyNXpkQ0FrZEdsMGJHVWdQU0JrYjJOMWJXVnVkQzVuWlhSRmJHVnRaVzUwUW5sSlpDZ25hbk10ZEdsMGJHVW5LVHRjYm1OdmJuTjBJQ1JoY25KdmR5QTlJR1J2WTNWdFpXNTBMbkYxWlhKNVUyVnNaV04wYjNJb0p5NWhjbkp2ZHljcE8xeHVZMjl1YzNRZ0pHMXZaR0ZzSUQwZ1pHOWpkVzFsYm5RdWNYVmxjbmxUWld4bFkzUnZjaWduTG0xdlpHRnNKeWs3WEc1amIyNXpkQ0FrYkdsbmFIUmliM2dnUFNCa2IyTjFiV1Z1ZEM1eGRXVnllVk5sYkdWamRHOXlLQ2N1YkdsbmFIUmliM2duS1R0Y2JtTnZibk4wSUNSMmFXVjNJRDBnWkc5amRXMWxiblF1Y1hWbGNubFRaV3hsWTNSdmNpZ25MbXhwWjJoMFltOTRMWFpwWlhjbktUdGNibHh1YkdWMElITnZjblJMWlhrZ1BTQXdPeUF2THlBd0lEMGdZWEowYVhOMExDQXhJRDBnZEdsMGJHVmNibXhsZENCbGJuUnlhV1Z6SUQwZ2V5QmllVUYxZEdodmNqb2dXMTBzSUdKNVZHbDBiR1U2SUZ0ZElIMDdYRzVzWlhRZ1kzVnljbVZ1ZEV4bGRIUmxjaUE5SUNkQkp6dGNibHh1YkdWMElHeHBaMmgwWW05NElEMGdabUZzYzJVN1hHNXNaWFFnZURJZ1BTQm1ZV3h6WlR0Y2JtTnZibk4wSUdGMGRHRmphRWx0WVdkbFRHbHpkR1Z1WlhKeklEMGdLQ2tnUFQ0Z2UxeHVYSFJzWlhRZ0pHbHRZV2RsY3lBOUlFRnljbUY1TG1aeWIyMG9aRzlqZFcxbGJuUXVjWFZsY25sVFpXeGxZM1J2Y2tGc2JDZ25MbUZ5ZEdsamJHVXRhVzFoWjJVbktTazdYRzVjYmx4MEpHbHRZV2RsY3k1bWIzSkZZV05vS0dsdFp5QTlQaUI3WEc1Y2RGeDBhVzFuTG1Ga1pFVjJaVzUwVEdsemRHVnVaWElvSjJOc2FXTnJKeXdnS0dWMmRDa2dQVDRnZTF4dVhIUmNkRngwYVdZZ0tDRnNhV2RvZEdKdmVDa2dlMXh1WEhSY2RGeDBYSFJzWlhRZ2MzSmpJRDBnYVcxbkxuTnlZenRjYmx4MFhIUmNkRngwTHk4Z2JHVjBJSFI1Y0dVZ1BTQnBiV2N1ZDJsa2RHZ2dQajBnYVcxbkxtaGxhV2RvZENBL0lDZHNKeUE2SUNkd0p6dGNibHgwWEhSY2RGeDBYRzVjZEZ4MFhIUmNkQ1JzYVdkb2RHSnZlQzVqYkdGemMweHBjM1F1WVdSa0tDZHphRzkzTFdsdFp5Y3BPMXh1WEhSY2RGeDBYSFFrZG1sbGR5NXpaWFJCZEhSeWFXSjFkR1VvSjNOMGVXeGxKeXdnWUdKaFkydG5jbTkxYm1RdGFXMWhaMlU2SUhWeWJDZ2tlM055WTMwcFlDazdYRzVjZEZ4MFhIUmNkR3hwWjJoMFltOTRJRDBnZEhKMVpUdGNibHgwWEhSY2RIMWNibHgwWEhSOUtUdGNibHgwZlNrN1hHNWNibHgwSkhacFpYY3VZV1JrUlhabGJuUk1hWE4wWlc1bGNpZ25ZMnhwWTJzbkxDQW9LU0E5UGlCN1hHNWNkRngwYVdZZ0tHeHBaMmgwWW05NEtTQjdYRzVjZEZ4MFhIUWtiR2xuYUhSaWIzZ3VZMnhoYzNOTWFYTjBMbkpsYlc5MlpTZ25jMmh2ZHkxcGJXY25LVHRjYmx4MFhIUmNkQ1JzYVdkb2RHSnZlQzVtYVhKemRFVnNaVzFsYm5SRGFHbHNaQzVqYkdGemMweHBjM1F1Y21WdGIzWmxLQ2QyYVdWM0xYZ3lKeWs3WEc1Y2RGeDBYSFJzYVdkb2RHSnZlQ0E5SUdaaGJITmxPMXh1WEhSY2RIMWNibHgwZlNrN1hHNTlPMXh1WEc1c1pYUWdiVzlrWVd3Z1BTQm1ZV3h6WlR0Y2JtTnZibk4wSUdGMGRHRmphRTF2WkdGc1RHbHpkR1Z1WlhKeklEMGdLQ2tnUFQ0Z2UxeHVYSFJqYjI1emRDQWtabWx1WkNBOUlHUnZZM1Z0Wlc1MExtZGxkRVZzWlcxbGJuUkNlVWxrS0NkcWN5MW1hVzVrSnlrN1hHNWNkRnh1WEhRa1ptbHVaQzVoWkdSRmRtVnVkRXhwYzNSbGJtVnlLQ2RqYkdsamF5Y3NJQ2dwSUQwK0lIdGNibHgwWEhRa2JXOWtZV3d1WTJ4aGMzTk1hWE4wTG1Ga1pDZ25jMmh2ZHljcE8xeHVYSFJjZEcxdlpHRnNJRDBnZEhKMVpUdGNibHgwZlNrN1hHNWNibHgwSkcxdlpHRnNMbUZrWkVWMlpXNTBUR2x6ZEdWdVpYSW9KMk5zYVdOckp5d2dLQ2tnUFQ0Z2UxeHVYSFJjZENSdGIyUmhiQzVqYkdGemMweHBjM1F1Y21WdGIzWmxLQ2R6YUc5M0p5azdYRzVjZEZ4MGJXOWtZV3dnUFNCbVlXeHpaVHRjYmx4MGZTazdYRzVjYmx4MGQybHVaRzkzTG1Ga1pFVjJaVzUwVEdsemRHVnVaWElvSjJ0bGVXUnZkMjRuTENBb0tTQTlQaUI3WEc1Y2RGeDBhV1lnS0cxdlpHRnNLU0I3WEc1Y2RGeDBYSFJ6WlhSVWFXMWxiM1YwS0NncElEMCtJSHRjYmx4MFhIUmNkRngwSkcxdlpHRnNMbU5zWVhOelRHbHpkQzV5WlcxdmRtVW9KM05vYjNjbktUdGNibHgwWEhSY2RGeDBiVzlrWVd3Z1BTQm1ZV3h6WlR0Y2JseDBYSFJjZEgwc0lEWXdNQ2s3WEc1Y2RGeDBmVHRjYmx4MGZTazdYRzU5WEc1Y2JtTnZibk4wSUhOamNtOXNiRlJ2Vkc5d0lEMGdLQ2tnUFQ0Z2UxeHVYSFJzWlhRZ2RHaHBibWNnUFNCa2IyTjFiV1Z1ZEM1blpYUkZiR1Z0Wlc1MFFubEpaQ2duWVc1amFHOXlMWFJoY21kbGRDY3BPMXh1WEhSMGFHbHVaeTV6WTNKdmJHeEpiblJ2Vm1sbGR5aDdZbVZvWVhacGIzSTZJRndpYzIxdmIzUm9YQ0lzSUdKc2IyTnJPaUJjSW5OMFlYSjBYQ0o5S1R0Y2JuMWNibHh1YkdWMElIQnlaWFk3WEc1c1pYUWdZM1Z5Y21WdWRDQTlJREE3WEc1c1pYUWdhWE5UYUc5M2FXNW5JRDBnWm1Gc2MyVTdYRzVqYjI1emRDQmhkSFJoWTJoQmNuSnZkMHhwYzNSbGJtVnljeUE5SUNncElEMCtJSHRjYmx4MEpHRnljbTkzTG1Ga1pFVjJaVzUwVEdsemRHVnVaWElvSjJOc2FXTnJKeXdnS0NrZ1BUNGdlMXh1WEhSY2RITmpjbTlzYkZSdlZHOXdLQ2s3WEc1Y2RIMHBPMXh1WEc1Y2RDUndZWEpoYkd4aGVDNWhaR1JGZG1WdWRFeHBjM1JsYm1WeUtDZHpZM0p2Ykd3bkxDQW9LU0E5UGlCN1hHNWNibHgwWEhSc1pYUWdlU0E5SUNSMGFYUnNaUzVuWlhSQ2IzVnVaR2x1WjBOc2FXVnVkRkpsWTNRb0tTNTVPMXh1WEhSY2RHbG1JQ2hqZFhKeVpXNTBJQ0U5UFNCNUtTQjdYRzVjZEZ4MFhIUndjbVYySUQwZ1kzVnljbVZ1ZER0Y2JseDBYSFJjZEdOMWNuSmxiblFnUFNCNU8xeHVYSFJjZEgxY2JseHVYSFJjZEdsbUlDaDVJRHc5SUMwMU1DQW1KaUFoYVhOVGFHOTNhVzVuS1NCN1hHNWNkRngwWEhRa1lYSnliM2N1WTJ4aGMzTk1hWE4wTG1Ga1pDZ25jMmh2ZHljcE8xeHVYSFJjZEZ4MGFYTlRhRzkzYVc1bklEMGdkSEoxWlR0Y2JseDBYSFI5SUdWc2MyVWdhV1lnS0hrZ1BpQXROVEFnSmlZZ2FYTlRhRzkzYVc1bktTQjdYRzVjZEZ4MFhIUWtZWEp5YjNjdVkyeGhjM05NYVhOMExuSmxiVzkyWlNnbmMyaHZkeWNwTzF4dVhIUmNkRngwYVhOVGFHOTNhVzVuSUQwZ1ptRnNjMlU3WEc1Y2RGeDBmVnh1WEhSOUtUdGNibjA3WEc1Y2JtTnZibk4wSUdGa1pGTnZjblJDZFhSMGIyNU1hWE4wWlc1bGNuTWdQU0FvS1NBOVBpQjdYRzVjZEd4bGRDQWtZbmxCY25ScGMzUWdQU0JrYjJOMWJXVnVkQzVuWlhSRmJHVnRaVzUwUW5sSlpDZ25hbk10WW5rdFlYSjBhWE4wSnlrN1hHNWNkR3hsZENBa1lubFVhWFJzWlNBOUlHUnZZM1Z0Wlc1MExtZGxkRVZzWlcxbGJuUkNlVWxrS0NkcWN5MWllUzEwYVhSc1pTY3BPMXh1WEhRa1lubEJjblJwYzNRdVlXUmtSWFpsYm5STWFYTjBaVzVsY2lnblkyeHBZMnNuTENBb0tTQTlQaUI3WEc1Y2RGeDBhV1lnS0hOdmNuUkxaWGtwSUh0Y2JseDBYSFJjZEhOamNtOXNiRlJ2Vkc5d0tDazdYRzVjZEZ4MFhIUnpiM0owUzJWNUlEMGdNRHRjYmx4MFhIUmNkQ1JpZVVGeWRHbHpkQzVqYkdGemMweHBjM1F1WVdSa0tDZGhZM1JwZG1VbktUdGNibHgwWEhSY2RDUmllVlJwZEd4bExtTnNZWE56VEdsemRDNXlaVzF2ZG1Vb0oyRmpkR2wyWlNjcE8xeHVYRzVjZEZ4MFhIUnlaVzVrWlhKRmJuUnlhV1Z6S0NrN1hHNWNkRngwZlZ4dVhIUjlLVHRjYmx4dVhIUWtZbmxVYVhSc1pTNWhaR1JGZG1WdWRFeHBjM1JsYm1WeUtDZGpiR2xqYXljc0lDZ3BJRDArSUh0Y2JseDBYSFJwWmlBb0lYTnZjblJMWlhrcElIdGNibHgwWEhSY2RITmpjbTlzYkZSdlZHOXdLQ2s3WEc1Y2RGeDBYSFJ6YjNKMFMyVjVJRDBnTVR0Y2JseDBYSFJjZENSaWVWUnBkR3hsTG1Oc1lYTnpUR2x6ZEM1aFpHUW9KMkZqZEdsMlpTY3BPMXh1WEhSY2RGeDBKR0o1UVhKMGFYTjBMbU5zWVhOelRHbHpkQzV5WlcxdmRtVW9KMkZqZEdsMlpTY3BPMXh1WEc1Y2RGeDBYSFJ5Wlc1a1pYSkZiblJ5YVdWektDazdYRzVjZEZ4MGZWeHVYSFI5S1R0Y2JuMDdYRzVjYm1OdmJuTjBJR05zWldGeVFXNWphRzl5Y3lBOUlDaHdjbVYyVTJWc1pXTjBiM0lwSUQwK0lIdGNibHgwYkdWMElDUmxiblJ5YVdWeklEMGdRWEp5WVhrdVpuSnZiU2hrYjJOMWJXVnVkQzV4ZFdWeWVWTmxiR1ZqZEc5eVFXeHNLSEJ5WlhaVFpXeGxZM1J2Y2lrcE8xeHVYSFFrWlc1MGNtbGxjeTVtYjNKRllXTm9LR1Z1ZEhKNUlEMCtJR1Z1ZEhKNUxuSmxiVzkyWlVGMGRISnBZblYwWlNnbmJtRnRaU2NwS1R0Y2JuMDdYRzVjYm1OdmJuTjBJR1pwYm1SR2FYSnpkRVZ1ZEhKNUlEMGdLR05vWVhJcElEMCtJSHRjYmx4MGJHVjBJSE5sYkdWamRHOXlJRDBnYzI5eWRFdGxlU0EvSUNjdWFuTXRaVzUwY25rdGRHbDBiR1VuSURvZ0p5NXFjeTFsYm5SeWVTMWhjblJwYzNRbk8xeHVYSFJzWlhRZ2NISmxkbE5sYkdWamRHOXlJRDBnSVhOdmNuUkxaWGtnUHlBbkxtcHpMV1Z1ZEhKNUxYUnBkR3hsSnlBNklDY3Vhbk10Wlc1MGNua3RZWEowYVhOMEp6dGNibHgwYkdWMElDUmxiblJ5YVdWeklEMGdRWEp5WVhrdVpuSnZiU2hrYjJOMWJXVnVkQzV4ZFdWeWVWTmxiR1ZqZEc5eVFXeHNLSE5sYkdWamRHOXlLU2s3WEc1Y2JseDBZMnhsWVhKQmJtTm9iM0p6S0hCeVpYWlRaV3hsWTNSdmNpazdYRzVjYmx4MGNtVjBkWEp1SUNSbGJuUnlhV1Z6TG1acGJtUW9aVzUwY25rZ1BUNGdlMXh1WEhSY2RHeGxkQ0J1YjJSbElEMGdaVzUwY25rdWJtVjRkRVZzWlcxbGJuUlRhV0pzYVc1bk8xeHVYSFJjZEhKbGRIVnliaUJ1YjJSbExtbHVibVZ5U0ZSTlRGc3dYU0E5UFQwZ1kyaGhjaUI4ZkNCdWIyUmxMbWx1Ym1WeVNGUk5URnN3WFNBOVBUMGdZMmhoY2k1MGIxVndjR1Z5UTJGelpTZ3BPMXh1WEhSOUtUdGNibjA3WEc1Y2JseHVZMjl1YzNRZ2JXRnJaVUZzY0doaFltVjBJRDBnS0NrZ1BUNGdlMXh1WEhSamIyNXpkQ0JoZEhSaFkyaEJibU5vYjNKTWFYTjBaVzVsY2lBOUlDZ2tZVzVqYUc5eUxDQnNaWFIwWlhJcElEMCtJSHRjYmx4MFhIUWtZVzVqYUc5eUxtRmtaRVYyWlc1MFRHbHpkR1Z1WlhJb0oyTnNhV05ySnl3Z0tDa2dQVDRnZTF4dVhIUmNkRngwWTI5dWMzUWdiR1YwZEdWeVRtOWtaU0E5SUdSdlkzVnRaVzUwTG1kbGRFVnNaVzFsYm5SQ2VVbGtLR3hsZEhSbGNpazdYRzVjZEZ4MFhIUnNaWFFnZEdGeVoyVjBPMXh1WEc1Y2RGeDBYSFJwWmlBb0lYTnZjblJMWlhrcElIdGNibHgwWEhSY2RGeDBkR0Z5WjJWMElEMGdiR1YwZEdWeUlEMDlQU0FuWVNjZ1B5QmtiMk4xYldWdWRDNW5aWFJGYkdWdFpXNTBRbmxKWkNnbllXNWphRzl5TFhSaGNtZGxkQ2NwSURvZ2JHVjBkR1Z5VG05a1pTNXdZWEpsYm5SRmJHVnRaVzUwTG5CaGNtVnVkRVZzWlcxbGJuUXVjR0Z5Wlc1MFJXeGxiV1Z1ZEM1d1lYSmxiblJGYkdWdFpXNTBMbkJ5WlhacGIzVnpSV3hsYldWdWRGTnBZbXhwYm1jdWNYVmxjbmxUWld4bFkzUnZjaWduTG1wekxXRnlkR2xqYkdVdFlXNWphRzl5TFhSaGNtZGxkQ2NwTzF4dVhIUmNkRngwZlNCbGJITmxJSHRjYmx4MFhIUmNkRngwZEdGeVoyVjBJRDBnYkdWMGRHVnlJRDA5UFNBbllTY2dQeUJrYjJOMWJXVnVkQzVuWlhSRmJHVnRaVzUwUW5sSlpDZ25ZVzVqYUc5eUxYUmhjbWRsZENjcElEb2diR1YwZEdWeVRtOWtaUzV3WVhKbGJuUkZiR1Z0Wlc1MExuQmhjbVZ1ZEVWc1pXMWxiblF1Y0dGeVpXNTBSV3hsYldWdWRDNXdjbVYyYVc5MWMwVnNaVzFsYm5SVGFXSnNhVzVuTG5GMVpYSjVVMlZzWldOMGIzSW9KeTVxY3kxaGNuUnBZMnhsTFdGdVkyaHZjaTEwWVhKblpYUW5LVHRjYmx4MFhIUmNkSDA3WEc1Y2JseDBYSFJjZEhSaGNtZGxkQzV6WTNKdmJHeEpiblJ2Vm1sbGR5aDdZbVZvWVhacGIzSTZJRndpYzIxdmIzUm9YQ0lzSUdKc2IyTnJPaUJjSW5OMFlYSjBYQ0o5S1R0Y2JseDBYSFI5S1R0Y2JseDBmVHRjYmx4dVhIUnNaWFFnWVdOMGFYWmxSVzUwY21sbGN5QTlJSHQ5TzF4dVhIUnNaWFFnSkc5MWRHVnlJRDBnWkc5amRXMWxiblF1Y1hWbGNubFRaV3hsWTNSdmNpZ25MbUZzY0doaFltVjBYMTlzWlhSMFpYSnpKeWs3WEc1Y2RDUnZkWFJsY2k1cGJtNWxja2hVVFV3Z1BTQW5KenRjYmx4dVhIUmhiSEJvWVdKbGRDNW1iM0pGWVdOb0tHeGxkSFJsY2lBOVBpQjdYRzVjZEZ4MGJHVjBJQ1JtYVhKemRFVnVkSEo1SUQwZ1ptbHVaRVpwY25OMFJXNTBjbmtvYkdWMGRHVnlLVHRjYmx4MFhIUnNaWFFnSkdGdVkyaHZjaUE5SUdSdlkzVnRaVzUwTG1OeVpXRjBaVVZzWlcxbGJuUW9KMkVuS1R0Y2JseHVYSFJjZEdsbUlDZ2hKR1pwY25OMFJXNTBjbmtwSUhKbGRIVnlianRjYmx4dVhIUmNkQ1JtYVhKemRFVnVkSEo1TG1sa0lEMGdiR1YwZEdWeU8xeHVYSFJjZENSaGJtTm9iM0l1YVc1dVpYSklWRTFNSUQwZ2JHVjBkR1Z5TG5SdlZYQndaWEpEWVhObEtDazdYRzVjZEZ4MEpHRnVZMmh2Y2k1amJHRnpjMDVoYldVZ1BTQW5ZV3h3YUdGaVpYUmZYMnhsZEhSbGNpMWhibU5vYjNJbk8xeHVYRzVjZEZ4MFlYUjBZV05vUVc1amFHOXlUR2x6ZEdWdVpYSW9KR0Z1WTJodmNpd2diR1YwZEdWeUtUdGNibHgwWEhRa2IzVjBaWEl1WVhCd1pXNWtRMmhwYkdRb0pHRnVZMmh2Y2lrN1hHNWNkSDBwTzF4dWZUdGNibHh1WTI5dWMzUWdjbVZ1WkdWeVNXMWhaMlZ6SUQwZ0tHbHRZV2RsY3l3Z0pHbHRZV2RsY3lrZ1BUNGdlMXh1WEhScGJXRm5aWE11Wm05eVJXRmphQ2hwYldGblpTQTlQaUI3WEc1Y2RGeDBZMjl1YzNRZ2MzSmpJRDBnWUM0dUx5NHVMMkZ6YzJWMGN5OXBiV0ZuWlhNdkpIdHBiV0ZuWlgxZ08xeHVYSFJjZEdOdmJuTjBJQ1JwYldkUGRYUmxjaUE5SUdSdlkzVnRaVzUwTG1OeVpXRjBaVVZzWlcxbGJuUW9KMlJwZGljcE8xeHVYSFJjZEdOdmJuTjBJQ1JwYldjZ1BTQmtiMk4xYldWdWRDNWpjbVZoZEdWRmJHVnRaVzUwS0NkSlRVY25LVHRjYmx4MFhIUWthVzFuTG1Oc1lYTnpUbUZ0WlNBOUlDZGhjblJwWTJ4bExXbHRZV2RsSnp0Y2JseDBYSFFrYVcxbkxuTnlZeUE5SUhOeVl6dGNibHgwWEhRa2FXMW5UM1YwWlhJdVlYQndaVzVrUTJocGJHUW9KR2x0WnlrN1hHNWNkRngwSkdsdFlXZGxjeTVoY0hCbGJtUkRhR2xzWkNna2FXMW5UM1YwWlhJcE8xeHVYSFI5S1Z4dWZUdGNibHh1WTI5dWMzUWdjbVZ1WkdWeVJXNTBjbWxsY3lBOUlDZ3BJRDArSUh0Y2JseDBZMjl1YzNRZ0pHRnlkR2xqYkdWTWFYTjBJRDBnWkc5amRXMWxiblF1WjJWMFJXeGxiV1Z1ZEVKNVNXUW9KMnB6TFd4cGMzUW5LVHRjYmx4MFkyOXVjM1FnWlc1MGNtbGxjMHhwYzNRZ1BTQnpiM0owUzJWNUlEOGdaVzUwY21sbGN5NWllVlJwZEd4bElEb2daVzUwY21sbGN5NWllVUYxZEdodmNqdGNibHh1WEhRa1lYSjBhV05zWlV4cGMzUXVhVzV1WlhKSVZFMU1JRDBnSnljN1hHNWNibHgwWlc1MGNtbGxjMHhwYzNRdVptOXlSV0ZqYUNobGJuUnllU0E5UGlCN1hHNWNkRngwWTI5dWMzUWdleUIwYVhSc1pTd2diR0Z6ZEU1aGJXVXNJR1pwY25OMFRtRnRaU3dnYVcxaFoyVnpMQ0JrWlhOamNtbHdkR2x2Yml3Z1pHVjBZV2xzSUgwZ1BTQmxiblJ5ZVR0Y2JseHVYSFJjZENSaGNuUnBZMnhsVEdsemRDNXBibk5sY25SQlpHcGhZMlZ1ZEVoVVRVd29KMkpsWm05eVpXVnVaQ2NzSUdGeWRHbGpiR1ZVWlcxd2JHRjBaU2s3WEc1Y2JseDBYSFJqYjI1emRDQWtZV3hzVTJ4cFpHVnljeUE5SUdSdlkzVnRaVzUwTG5GMVpYSjVVMlZzWldOMGIzSkJiR3dvSnk1aGNuUnBZMnhsWDE5emJHbGtaWEl0YVc1dVpYSW5LVHRjYmx4MFhIUmpiMjV6ZENBa2MyeHBaR1Z5SUQwZ0pHRnNiRk5zYVdSbGNuTmJKR0ZzYkZOc2FXUmxjbk11YkdWdVozUm9JQzBnTVYwN1hHNWNkRngwTHk4Z1kyOXVjM1FnSkdsdFlXZGxjeUE5SUNSemJHbGtaWEl1Y1hWbGNubFRaV3hsWTNSdmNpZ25MbUZ5ZEdsamJHVmZYMmx0WVdkbGN5Y3BPMXh1WEc1Y2RGeDBhV1lnS0dsdFlXZGxjeTVzWlc1bmRHZ3BJSEpsYm1SbGNrbHRZV2RsY3locGJXRm5aWE1zSUNSemJHbGtaWElwTzF4dVhIUmNkRnh1WEhSY2RHTnZibk4wSUNSa1pYTmpjbWx3ZEdsdmJrOTFkR1Z5SUQwZ1pHOWpkVzFsYm5RdVkzSmxZWFJsUld4bGJXVnVkQ2duWkdsMkp5azdYRzVjZEZ4MFkyOXVjM1FnSkdSbGMyTnlhWEIwYVc5dVRtOWtaU0E5SUdSdlkzVnRaVzUwTG1OeVpXRjBaVVZzWlcxbGJuUW9KM0FuS1R0Y2JseDBYSFJqYjI1emRDQWtaR1YwWVdsc1RtOWtaU0E5SUdSdlkzVnRaVzUwTG1OeVpXRjBaVVZzWlcxbGJuUW9KM0FuS1R0Y2JseDBYSFFrWkdWelkzSnBjSFJwYjI1UGRYUmxjaTVqYkdGemMweHBjM1F1WVdSa0tDZGhjblJwWTJ4bExXUmxjMk55YVhCMGFXOXVYMTl2ZFhSbGNpY3BPMXh1WEhSY2RDUmtaWE5qY21sd2RHbHZiazV2WkdVdVkyeGhjM05NYVhOMExtRmtaQ2duWVhKMGFXTnNaUzFrWlhOamNtbHdkR2x2YmljcE8xeHVYSFJjZENSa1pYUmhhV3hPYjJSbExtTnNZWE56VEdsemRDNWhaR1FvSjJGeWRHbGpiR1V0WkdWMFlXbHNKeWs3WEc1Y2JseDBYSFFrWkdWelkzSnBjSFJwYjI1T2IyUmxMbWx1Ym1WeVNGUk5UQ0E5SUdSbGMyTnlhWEIwYVc5dU8xeHVYSFJjZENSa1pYUmhhV3hPYjJSbExtbHVibVZ5U0ZSTlRDQTlJR1JsZEdGcGJEdGNibHh1WEhSY2RDUmtaWE5qY21sd2RHbHZiazkxZEdWeUxtRndjR1Z1WkVOb2FXeGtLQ1JrWlhOamNtbHdkR2x2Yms1dlpHVXNJQ1JrWlhSaGFXeE9iMlJsS1R0Y2JseDBYSFFrYzJ4cFpHVnlMbUZ3Y0dWdVpFTm9hV3hrS0NSa1pYTmpjbWx3ZEdsdmJrOTFkR1Z5S1R0Y2JseHVYSFJjZEdOdmJuTjBJQ1IwYVhSc1pVNXZaR1Z6SUQwZ1pHOWpkVzFsYm5RdWNYVmxjbmxUWld4bFkzUnZja0ZzYkNnbkxtRnlkR2xqYkdVdGFHVmhaR2x1WjE5ZmRHbDBiR1VuS1R0Y2JseDBYSFJqYjI1emRDQWtkR2wwYkdVZ1BTQWtkR2wwYkdWT2IyUmxjMXNrZEdsMGJHVk9iMlJsY3k1c1pXNW5kR2dnTFNBeFhUdGNibHh1WEhSY2RHTnZibk4wSUNSbWFYSnpkRTV2WkdWeklEMGdaRzlqZFcxbGJuUXVjWFZsY25sVFpXeGxZM1J2Y2tGc2JDZ25MbUZ5ZEdsamJHVXRhR1ZoWkdsdVoxOWZibUZ0WlMwdFptbHljM1FuS1R0Y2JseDBYSFJqYjI1emRDQWtabWx5YzNRZ1BTQWtabWx5YzNST2IyUmxjMXNrWm1seWMzUk9iMlJsY3k1c1pXNW5kR2dnTFNBeFhUdGNibHh1WEhSY2RHTnZibk4wSUNSc1lYTjBUbTlrWlhNZ1BTQmtiMk4xYldWdWRDNXhkV1Z5ZVZObGJHVmpkRzl5UVd4c0tDY3VZWEowYVdOc1pTMW9aV0ZrYVc1blgxOXVZVzFsTFMxc1lYTjBKeWs3WEc1Y2RGeDBZMjl1YzNRZ0pHeGhjM1FnUFNBa2JHRnpkRTV2WkdWeld5UnNZWE4wVG05a1pYTXViR1Z1WjNSb0lDMGdNVjA3WEc1Y2JseDBYSFFrZEdsMGJHVXVhVzV1WlhKSVZFMU1JRDBnZEdsMGJHVTdYRzVjZEZ4MEpHWnBjbk4wTG1sdWJtVnlTRlJOVENBOUlHWnBjbk4wVG1GdFpUdGNibHgwWEhRa2JHRnpkQzVwYm01bGNraFVUVXdnUFNCc1lYTjBUbUZ0WlR0Y2JseHVYSFJjZEdOdmJuTjBJQ1JoY25KdmQwNWxlSFFnUFNBa2MyeHBaR1Z5TG5CaGNtVnVkRVZzWlcxbGJuUXVjWFZsY25sVFpXeGxZM1J2Y2lnbkxtRnljbTkzTFc1bGVIUW5LVHRjYmx4MFhIUmpiMjV6ZENBa1lYSnliM2RRY21WMklEMGdKSE5zYVdSbGNpNXdZWEpsYm5SRmJHVnRaVzUwTG5GMVpYSjVVMlZzWldOMGIzSW9KeTVoY25KdmR5MXdjbVYySnlrN1hHNWNibHgwWEhSc1pYUWdZM1Z5Y21WdWRDQTlJQ1J6Ykdsa1pYSXVabWx5YzNSRmJHVnRaVzUwUTJocGJHUTdYRzVjZEZ4MEpHRnljbTkzVG1WNGRDNWhaR1JGZG1WdWRFeHBjM1JsYm1WeUtDZGpiR2xqYXljc0lDZ3BJRDArSUh0Y2JseDBYSFJjZEdOdmJuTjBJRzVsZUhRZ1BTQmpkWEp5Wlc1MExtNWxlSFJGYkdWdFpXNTBVMmxpYkdsdVp6dGNibHgwWEhSY2RHbG1JQ2h1WlhoMEtTQjdYRzVjZEZ4MFhIUmNkRzVsZUhRdWMyTnliMnhzU1c1MGIxWnBaWGNvZTJKbGFHRjJhVzl5T2lCY0luTnRiMjkwYUZ3aUxDQmliRzlqYXpvZ1hDSnVaV0Z5WlhOMFhDSXNJR2x1YkdsdVpUb2dYQ0pqWlc1MFpYSmNJbjBwTzF4dVhIUmNkRngwWEhSamRYSnlaVzUwSUQwZ2JtVjRkRHRjYmx4MFhIUmNkSDFjYmx4MFhIUjlLVHRjYmx4dVhIUmNkQ1JoY25KdmQxQnlaWFl1WVdSa1JYWmxiblJNYVhOMFpXNWxjaWduWTJ4cFkyc25MQ0FvS1NBOVBpQjdYRzVjZEZ4MFhIUmpiMjV6ZENCd2NtVjJJRDBnWTNWeWNtVnVkQzV3Y21WMmFXOTFjMFZzWlcxbGJuUlRhV0pzYVc1bk8xeHVYSFJjZEZ4MGFXWWdLSEJ5WlhZcElIdGNibHgwWEhSY2RGeDBjSEpsZGk1elkzSnZiR3hKYm5SdlZtbGxkeWg3WW1Wb1lYWnBiM0k2SUZ3aWMyMXZiM1JvWENJc0lHSnNiMk5yT2lCY0ltNWxZWEpsYzNSY0lpd2dhVzVzYVc1bE9pQmNJbU5sYm5SbGNsd2lmU2s3WEc1Y2RGeDBYSFJjZEdOMWNuSmxiblFnUFNCd2NtVjJPMXh1WEhSY2RGeDBmVnh1WEhSY2RIMHBYRzVjZEgwcE8xeHVYRzVjZEdGMGRHRmphRWx0WVdkbFRHbHpkR1Z1WlhKektDazdYRzVjZEcxaGEyVkJiSEJvWVdKbGRDZ3BPMXh1ZlR0Y2JseHVMeThnZEdocGN5QnVaV1ZrY3lCMGJ5QmlaU0JoSUdSbFpYQmxjaUJ6YjNKMFhHNWpiMjV6ZENCemIzSjBRbmxVYVhSc1pTQTlJQ2dwSUQwK0lIdGNibHgwWlc1MGNtbGxjeTVpZVZScGRHeGxMbk52Y25Rb0tHRXNJR0lwSUQwK0lIdGNibHgwWEhSc1pYUWdZVlJwZEd4bElEMGdZUzUwYVhSc1pWc3dYUzUwYjFWd2NHVnlRMkZ6WlNncE8xeHVYSFJjZEd4bGRDQmlWR2wwYkdVZ1BTQmlMblJwZEd4bFd6QmRMblJ2VlhCd1pYSkRZWE5sS0NrN1hHNWNkRngwYVdZZ0tHRlVhWFJzWlNBK0lHSlVhWFJzWlNrZ2NtVjBkWEp1SURFN1hHNWNkRngwWld4elpTQnBaaUFvWVZScGRHeGxJRHdnWWxScGRHeGxLU0J5WlhSMWNtNGdMVEU3WEc1Y2RGeDBaV3h6WlNCeVpYUjFjbTRnTUR0Y2JseDBmU2s3WEc1OU8xeHVYRzVqYjI1emRDQnpaWFJFWVhSaElEMGdLR1JoZEdFcElEMCtJSHRjYmx4MFpXNTBjbWxsY3k1aWVVRjFkR2h2Y2lBOUlHUmhkR0U3WEc1Y2RHVnVkSEpwWlhNdVlubFVhWFJzWlNBOUlHUmhkR0V1YzJ4cFkyVW9LVHNnTHk4Z1kyOXdhV1Z6SUdSaGRHRWdabTl5SUdKNVZHbDBiR1VnYzI5eWRGeHVYSFJ6YjNKMFFubFVhWFJzWlNncE8xeHVYSFJ5Wlc1a1pYSkZiblJ5YVdWektDazdYRzU5WEc1Y2JtTnZibk4wSUdabGRHTm9SR0YwWVNBOUlDZ3BJRDArSUh0Y2JseDBYSFJtWlhSamFDaEVRaWt1ZEdobGJpaHlaWE1nUFQ1Y2JseDBYSFJjZEhKbGN5NXFjMjl1S0NsY2JseDBYSFFwTG5Sb1pXNG9aR0YwWVNBOVBpQjdYRzVjZEZ4MFhIUnpaWFJFWVhSaEtHUmhkR0VwTzF4dVhIUmNkSDBwWEc1Y2RGeDBMblJvWlc0b0tDa2dQVDRnZTF4dVhIUmNkRngwSkd4dllXUnBibWN1Wm05eVJXRmphQ2hsYkdWdElEMCtJR1ZzWlcwdVkyeGhjM05NYVhOMExtRmtaQ2duY21WaFpIa25LU2s3WEc1Y2RGeDBYSFFrYm1GMkxtTnNZWE56VEdsemRDNWhaR1FvSjNKbFlXUjVKeWs3WEc1Y2RGeDBmU2xjYmx4MFhIUXVZMkYwWTJnb1pYSnlJRDArSUdOdmJuTnZiR1V1ZDJGeWJpaGxjbklwS1R0Y2JuMDdYRzVjYm1OdmJuTjBJR2x1YVhRZ1BTQW9LU0E5UGlCN1hHNWNkSE50YjI5MGFITmpjbTlzYkM1d2IyeDVabWxzYkNncE8xeHVYSFJtWlhSamFFUmhkR0VvS1R0Y2JseDBibUYyVEdjb0tUdGNibHgwY21WdVpHVnlSVzUwY21sbGN5Z3BPMXh1WEhSaFpHUlRiM0owUW5WMGRHOXVUR2x6ZEdWdVpYSnpLQ2s3WEc1Y2RHRjBkR0ZqYUVGeWNtOTNUR2x6ZEdWdVpYSnpLQ2s3WEc1Y2RHRjBkR0ZqYUUxdlpHRnNUR2x6ZEdWdVpYSnpLQ2s3WEc1OVhHNWNibWx1YVhRb0tUdGNiaUlzSW1OdmJuTjBJSFJsYlhCc1lYUmxJRDBnWEc1Y2RHQThaR2wySUdOc1lYTnpQVndpYm1GMlgxOXBibTVsY2x3aVBseHVYSFJjZER4a2FYWWdZMnhoYzNNOVhDSnVZWFpmWDNOdmNuUXRZbmxjSWo1Y2JseDBYSFJjZER4emNHRnVJR05zWVhOelBWd2ljMjl5ZEMxaWVWOWZkR2wwYkdWY0lqNVRiM0owSUdKNVBDOXpjR0Z1UGx4dVhIUmNkRngwUEdKMWRIUnZiaUJqYkdGemN6MWNJbk52Y25RdFlua2djMjl5ZEMxaWVWOWZZbmt0WVhKMGFYTjBJR0ZqZEdsMlpWd2lJR2xrUFZ3aWFuTXRZbmt0WVhKMGFYTjBYQ0krUVhKMGFYTjBQQzlpZFhSMGIyNCtYRzVjZEZ4MFhIUThjM0JoYmlCamJHRnpjejFjSW5OdmNuUXRZbmxmWDJScGRtbGtaWEpjSWo0Z2ZDQThMM053WVc0K1hHNWNkRngwWEhROFluVjBkRzl1SUdOc1lYTnpQVndpYzI5eWRDMWllU0J6YjNKMExXSjVYMTlpZVMxMGFYUnNaVndpSUdsa1BWd2lhbk10WW5rdGRHbDBiR1ZjSWo1VWFYUnNaVHd2WW5WMGRHOXVQbHh1WEhSY2RGeDBQSE53WVc0Z1kyeGhjM005WENKbWFXNWtYQ0lnYVdROVhDSnFjeTFtYVc1a1hDSStYRzVjZEZ4MFhIUmNkQ2c4YzNCaGJpQmpiR0Z6Y3oxY0ltWnBibVF0TFdsdWJtVnlYQ0krSmlNNE9UZzBPMFk4TDNOd1lXNCtLVnh1WEhSY2RGeDBQQzl6Y0dGdVBseHVYSFJjZER3dlpHbDJQbHh1WEhSY2REeGthWFlnWTJ4aGMzTTlYQ0p1WVhaZlgyRnNjR2hoWW1WMFhDSStYRzVjZEZ4MFhIUThjM0JoYmlCamJHRnpjejFjSW1Gc2NHaGhZbVYwWDE5MGFYUnNaVndpUGtkdklIUnZQQzl6Y0dGdVBseHVYSFJjZEZ4MFBHUnBkaUJqYkdGemN6MWNJbUZzY0doaFltVjBYMTlzWlhSMFpYSnpYQ0krUEM5a2FYWStYRzVjZEZ4MFBDOWthWFkrWEc1Y2REd3ZaR2wyUG1BN1hHNWNibU52Ym5OMElHNWhka3huSUQwZ0tDa2dQVDRnZTF4dVhIUnNaWFFnYm1GMlQzVjBaWElnUFNCa2IyTjFiV1Z1ZEM1blpYUkZiR1Z0Wlc1MFFubEpaQ2duYW5NdGJtRjJKeWs3WEc1Y2RHNWhkazkxZEdWeUxtbHVibVZ5U0ZSTlRDQTlJSFJsYlhCc1lYUmxPMXh1ZlR0Y2JseHVaWGh3YjNKMElHUmxabUYxYkhRZ2JtRjJUR2M3SWwxOSJ9
