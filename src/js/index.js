import smoothscroll from 'smoothscroll-polyfill';

import { attachModalListeners, attachUpArrowListeners, makeAlphabet, makeSlider } from './modules';
import { articleTemplate, renderNavLg } from './templates';
import { debounce, hideLoading, scrollToTop } from './utils';
import { DB, $nav, $parallax, $content, $title, $upArrow, $lightbox, $view } from './constants';

let sortKey = 0; // 0 = artist, 1 = title
let entries = { byAuthor: [], byTitle: [] };
let currentLetter = 'A';
let lightbox = false;

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

const renderEntries = () => {
	const $articleList = document.getElementById('js-list');
	const entriesList = sortKey ? entries.byTitle : entries.byAuthor;

	$articleList.innerHTML = '';

	entriesList.forEach((entry, i) => {
		$articleList.insertAdjacentHTML('beforeend', articleTemplate(entry, i));
		makeSlider(document.getElementById(`slider-${i}`));
	});

	attachImageListeners();
	makeAlphabet(sortKey);
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
	attachUpArrowListeners();
	attachModalListeners();
}

init();
