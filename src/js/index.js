import smoothscroll from 'smoothscroll-polyfill';

import { articleTemplate, renderNavLg } from './templates';
import { debounce, hideLoading, scrollToTop, makeSlider } from './utils';

import { DB, alphabet, $nav, $parallax, $content, $title, $arrow, $modal, $lightbox, $view } from './constants';


let sortKey = 0; // 0 = artist, 1 = title
let entries = { byAuthor: [], byTitle: [] };
let currentLetter = 'A';
let modal = false;
let lightbox = false;

const attachImageListeners = () => {
	const $images = Array.from(document.querySelectorAll('.article-image'));

	$images.forEach(img => {
		img.addEventListener('click', (evt) => {
			if (!lightbox) {
				let src = img.src;
				
				$lightbox.classList.add('show-img');
				$view.setAttribute('style', `background-image: url(${src})`);
				lightbox = true;
			}
		});
	});

	$view.addEventListener('click', () => {
		if (lightbox) {
			$lightbox.classList.remove('show-img');
			lightbox = false;
		}
	});
};

const attachModalListeners = () => {
	const $find = document.getElementById('js-find');
	
	$find.addEventListener('click', () => {
		$modal.classList.add('show');
		modal = true;
	});

	$modal.addEventListener('click', () => {
		$modal.classList.remove('show');
		modal = false;
	});

	window.addEventListener('keydown', () => {
		if (modal) {
			setTimeout(() => {
				$modal.classList.remove('show');
				modal = false;
			}, 600);
		};
	});
}

let prev;
let current = 0;
let isShowing = false;
const attachArrowListeners = () => {
	$arrow.addEventListener('click', () => {
		scrollToTop();
	});

	$parallax.addEventListener('scroll', () => {

		let y = $title.getBoundingClientRect().y;
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

const addSortButtonListeners = () => {
	let $byArtist = document.getElementById('js-by-artist');
	let $byTitle = document.getElementById('js-by-title');
	$byArtist.addEventListener('click', () => {
		if (sortKey) {
			scrollToTop();
			sortKey = 0;
			$byArtist.classList.add('active');
			$byTitle.classList.remove('active');

			renderEntries();
		}
	});

	$byTitle.addEventListener('click', () => {
		if (!sortKey) {
			scrollToTop();
			sortKey = 1;
			$byTitle.classList.add('active');
			$byArtist.classList.remove('active');

			renderEntries();
		}
	});
};

const findFirstEntry = (char) => {
	const selector = sortKey ? '.js-entry-title' : '.js-entry-artist';
	const prevSelector = !sortKey ? '.js-entry-title' : '.js-entry-artist';

	const $entries = Array.from(document.querySelectorAll(selector));
	const $prevEntries = Array.from(document.querySelectorAll(prevSelector));

	$prevEntries.forEach(entry => entry.removeAttribute('name'));

	return $entries.find(entry => {
		let node = entry.nextElementSibling;
		return node.innerHTML[0] === char || node.innerHTML[0] === char.toUpperCase();
	});
};

const makeAlphabet = () => {
	const attachAnchorListener = ($anchor, letter) => {
		$anchor.addEventListener('click', () => {
			const letterNode = document.getElementById(letter);
			let target;

			if (!sortKey) {
				target = letter === 'a' ? document.getElementById('anchor-target') : letterNode.parentElement.parentElement.parentElement.parentElement.previousElementSibling.querySelector('.js-article-anchor-target');
			} else {
				target = letter === 'a' ? document.getElementById('anchor-target') : letterNode.parentElement.parentElement.parentElement.previousElementSibling.querySelector('.js-article-anchor-target');
			};

			target.scrollIntoView({behavior: "smooth", block: "start"});
		});
	};

	let activeEntries = {};
	let $outer = document.querySelector('.alphabet__letters');
	$outer.innerHTML = '';

	alphabet.forEach(letter => {
		let $firstEntry = findFirstEntry(letter);
		let $anchor = document.createElement('a');

		if (!$firstEntry) return;

		$firstEntry.id = letter;
		$anchor.innerHTML = letter.toUpperCase();
		$anchor.className = 'alphabet__letter-anchor';

		attachAnchorListener($anchor, letter);
		$outer.appendChild($anchor);
	});
};

const renderEntries = () => {
	const $articleList = document.getElementById('js-list');
	const entriesList = sortKey ? entries.byTitle : entries.byAuthor;

	$articleList.innerHTML = '';

	entriesList.forEach((entry, i) => {
		$articleList.insertAdjacentHTML('beforeend', articleTemplate(entry, i));
		makeSlider(document.getElementById(`slider-${i}`));
	});

	attachImageListeners();
	makeAlphabet();
};

const setDataAndSortByTitle = (data) => {
	entries.byAuthor = data;
	entries.byTitle = data.slice(); // copies data for byTitle sort

	entries.byTitle.sort((a, b) => {
		let aTitle = a.title[0].toUpperCase();
		let bTitle = b.title[0].toUpperCase();
		if (aTitle > bTitle) return 1;
		else if (aTitle < bTitle) return -1;
		else return 0;
	});
};

const fetchData = () => {
	fetch(DB).then(res => res.json())
	.then(data => {
		setDataAndSortByTitle(data);
		renderEntries();
		hideLoading();
	})
	.catch(err => console.warn(err));
};

const init = () => {
	smoothscroll.polyfill();
	fetchData();

	renderNavLg();
	addSortButtonListeners();
	attachArrowListeners();
	attachModalListeners();
}

init();
