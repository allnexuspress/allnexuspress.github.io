import smoothscroll from 'smoothscroll-polyfill';

import { articleTemplate, navLg } from './templates';
import { debounce, hideLoading } from './utils';
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

const scrollToTop = () => {
	let thing = document.getElementById('anchor-target');
	thing.scrollIntoView({behavior: "smooth", block: "start"});
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

const renderImages = (images, $images) => {
	images.forEach(image => {
		const src = `../../assets/images/${image}`;
		const $imgOuter = document.createElement('div');
		const $img = document.createElement('IMG');
		$img.className = 'article-image';
		$img.src = src;
		$imgOuter.appendChild($img);
		$images.appendChild($imgOuter);
	})
};

const renderEntries = () => {
	const $articleList = document.getElementById('js-list');
	const entriesList = sortKey ? entries.byTitle : entries.byAuthor;

	$articleList.innerHTML = '';

	entriesList.forEach(entry => {
		const { title, lastName, firstName, images, description, detail } = entry;

		$articleList.insertAdjacentHTML('beforeend', articleTemplate);

		const $allSliders = document.querySelectorAll('.article__slider-inner');
		const $slider = $allSliders[$allSliders.length - 1];
		// const $images = $slider.querySelector('.article__images');

		if (images.length) renderImages(images, $slider);
		
		const $descriptionOuter = document.createElement('div');
		const $descriptionNode = document.createElement('p');
		const $detailNode = document.createElement('p');
		$descriptionOuter.classList.add('article-description__outer');
		$descriptionNode.classList.add('article-description');
		$detailNode.classList.add('article-detail');

		$descriptionNode.innerHTML = description;
		$detailNode.innerHTML = detail;

		$descriptionOuter.appendChild($descriptionNode, $detailNode);
		$slider.appendChild($descriptionOuter);

		const $titleNodes = document.querySelectorAll('.article-heading__title');
		const $title = $titleNodes[$titleNodes.length - 1];

		const $firstNodes = document.querySelectorAll('.article-heading__name--first');
		const $first = $firstNodes[$firstNodes.length - 1];

		const $lastNodes = document.querySelectorAll('.article-heading__name--last');
		const $last = $lastNodes[$lastNodes.length - 1];

		$title.innerHTML = title;
		$first.innerHTML = firstName;
		$last.innerHTML = lastName;

		const $arrowNext = $slider.parentElement.querySelector('.arrow-next');
		const $arrowPrev = $slider.parentElement.querySelector('.arrow-prev');

		let current = $slider.firstElementChild;
		$arrowNext.addEventListener('click', () => {
			const next = current.nextElementSibling;
			if (next) {
				next.scrollIntoView({behavior: "smooth", block: "nearest", inline: "center"});
				current = next;
			}
		});

		$arrowPrev.addEventListener('click', () => {
			const prev = current.previousElementSibling;
			if (prev) {
				prev.scrollIntoView({behavior: "smooth", block: "nearest", inline: "center"});
				current = prev;
			}
		})
	});

	attachImageListeners();
	makeAlphabet();
};

// this needs to be a deeper sort
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
	entries.byTitle = data.slice(); // copies data for byTitle sort

	sortByTitle();
	renderEntries();
};

const fetchData = () => {
	fetch(DB).then(res => res.json())
	.then(data => {
		setData(data);
		hideLoading();
	})
	.catch(err => console.warn(err));
};

const init = () => {
	smoothscroll.polyfill();
	fetchData();
	navLg();
	addSortButtonListeners();
	attachArrowListeners();
	attachModalListeners();
}

init();
