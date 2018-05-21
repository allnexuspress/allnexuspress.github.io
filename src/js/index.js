import mobileNav from './nav-mobile';
import globalNav from './nav-global';

const DB = 'https://nexus-catalog.firebaseio.com/posts.json?auth=7g7pyKKykN3N5ewrImhOaS6vwrFsc5fKkrk8ejzf';
const alphabet = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z'];

// 0 = artist, 1 = title
let sortKey = 0;
let entries = {
	byAuthor: [],
	byTitle: []
};
let activeEntries = {};
let currScroll = 0;
let headerIsVisible = true;

let articleTemplate = `
	<article class="article__outer">
		<div class="article__inner">
			<div class="article__heading">
				<a class="js-entry-title"></a>
				<h2 class="article-heading__title"></h2>
				<div class="article-heading__name">
					<span class="article-heading__name--first"></span>
					<a class="js-entry-artist"></a>
					<span class="article-heading__name--last"></span>
				</div>
			</div>
			<div class="article__images-outer">
				<div class="article__images-inner"></div>
			</div>
		</div>
	</article>
`;

const scrollToTop = () => {
	let thing = document.querySelector('.parallax');
	thing.scrollTop = 0;
}

const addSortButtonListeners = () => {
	let $artist = document.getElementById('js-by-artist');
	let $title = document.getElementById('js-by-title');

	$artist.addEventListener('click', () => {
		scrollToTop();
		if (sortKey) {
			sortKey = 0;
			renderEntries();
		}
	});

	$title.addEventListener('click', () => {
		scrollToTop();
		if (!sortKey) {
			sortKey = 1;
			renderEntries();
		}
	});
};

let isShowing = false;
const toggleMobileNav = () => {
	let $nav = document.getElementById('js-nav');
	let $icon = document.getElementById('js-angle-icon');
	let $list = document.getElementById('js-list');

	if (!isShowing) {
			$nav.classList.add('u-show');
			$icon.setAttribute('style', 'transform: rotate(180deg');
			$list.setAttribute('style', 'transform: translateY(210px)');

			isShowing = true;
	} else {
		$nav.classList.remove('u-show');
		$nav.classList.add('u-hide')
		$icon.setAttribute('style', 'transform: rotate(0deg');
		$list.setAttribute('style', 'transform: translateY(65px)');

		isShowing = false;
	}
};

const addMobileControlButton = () => {
	let $button = document.getElementById('js-mobile-nav');
	$button.addEventListener('click', toggleMobileNav);
};

const setHeaderListeners = () => {
	let $parallax = document.querySelector('.parallax');
	let $title = document.getElementById('js-title');
	let $header = document.getElementById('js-nav');

	$parallax.addEventListener('scroll', () => {
		let titleY = $title.getBoundingClientRect().top;

		if (titleY <= 115) {
			if (headerIsVisible) {
				headerIsVisible = false;
				$header.style.opacity = 0.2;
			}
		}
		if (titleY >= 110) {
			if (!headerIsVisible) {
				headerIsVisible = true;
				$header.style.opacity = 1;
			}
		}
	});

	$header.addEventListener('mouseover', () => {
		let titleY = $title.getBoundingClientRect().top;

			if (titleY < 120) {
				if (!headerIsVisible) {
					headerIsVisible = true;
					$header.style.opacity = 1;
				}
			}
	});

	$header.addEventListener('mouseout', () => {
		let titleY = $title.getBoundingClientRect().top;

		if (titleY < 120) {
			if (headerIsVisible) {
				headerIsVisible = false;
				$header.style.opacity = 0.2;
			}
		}
	})
};

const makeAlphabet = () => {
	let $outer = document.querySelector('.alphabet__letters-inner');
	$outer.innerHTML = '';

	alphabet.forEach(letter => {
		let $anchor = document.createElement('a');

		$anchor.innerHTML = letter.toUpperCase();
		$anchor.className = 'alphabet__letter-anchor';
		if (activeEntries[letter]) $anchor.setAttribute('href', '#' + letter);

		$outer.append($anchor);
	});
};

const clearAnchors = (prevSelector) => {
	let $entries = Array.from(document.querySelectorAll(prevSelector));
	$entries.forEach(entry => entry.removeAttribute('name'));
};

const findFirstEntry = (char) => {
	let selector = sortKey ? '.js-entry-title' : '.js-entry-artist';
	let prevSelector = !sortKey ? '.js-entry-title' : '.js-entry-artist';
	let $entries = Array.from(document.querySelectorAll(selector));

	clearAnchors(prevSelector);

	return $entries.find(entry => {
		let node = entry.nextElementSibling;
		return node.innerHTML[0] === char || node.innerHTML[0] === char.toUpperCase();
	});
};

const setAlphabetAnchors = () => {
	activeEntries = {};

	alphabet.forEach(char => {
		let firstEntry = findFirstEntry(char);

		if (firstEntry) {
			activeEntries[char] = 1;
			// firstEntry.top = 200;
			firstEntry.setAttribute('name', char);
		}
	});

	makeAlphabet();
};

const renderImages = (images) => {
	let $imagesNodes = document.querySelectorAll('.article__images-inner');
	let $images = $imagesNodes[$imagesNodes.length - 1];

	images.forEach(image => {
		let $img = document.createElement('IMG');
		$img.src = image;
		$images.append($img);
	})
};

const renderEntries = () => {
	let $articleList = document.getElementById('js-list');
	let entriesList = sortKey ? entries.byTitle : entries.byAuthor;

	$articleList.innerHTML = '';

	entriesList.forEach(entry => {
		let { title, lastName, firstName, images } = entry;

		$articleList.insertAdjacentHTML('beforeend', articleTemplate);

		if (images.length) renderImages(images);

		let $titleNodes = document.querySelectorAll('.article-heading__title');
		let $title = $titleNodes[$titleNodes.length - 1];

		let $firstNodes = document.querySelectorAll('.article-heading__name--first');
		let $first = $firstNodes[$firstNodes.length - 1];

		let $lastNodes = document.querySelectorAll('.article-heading__name--last');
		let $last = $lastNodes[$lastNodes.length - 1];

		$title.innerHTML = title;
		$first.innerHTML = firstName;
		$last.innerHTML = lastName;

		let imageList = Array.from(document.querySelectorAll('.article__images-inner'));
		imageList.forEach(image => {
		let lastChild = image.lastElementChild;
		if (lastChild) lastChild.style.paddingRight = '200px';
	});

	});

	setAlphabetAnchors();
};

const sortByTitle = () => {
	entries.byTitle.sort((a, b) => {
		let aTitle = a.title[0].toUpperCase();
		let bTitle = b.title[0].toUpperCase();
		if (aTitle > bTitle) return 1;
		else if (aTitle < bTitle) return -1;
		else return 0;
	});
};

const setData = (data) => {
	entries.byAuthor = data;
	entries.byTitle = data.slice();
	sortByTitle();
	renderEntries();
}

const fetchData = () => {
		fetch(DB).then(res =>
			res.json()
		).then(data => {
			setData(data);
		})
		.then(() => {
		})
		.catch(err => console.warn(err));
};

const init = () => {
	fetchData();
	mobileNav();
	globalNav();
	addSortButtonListeners();
	setHeaderListeners();
	addMobileControlButton();
}

init();
