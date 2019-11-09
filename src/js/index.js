import smoothscroll from 'smoothscroll-polyfill';
import 'whatwg-fetch'; 

import { articleTemplate, renderNavLg } from './templates';
import { debounce, hideLoading, scrollToTop } from './utils';
import { DB, $articleList, sortIds } from './constants';
import { attachModalListeners, attachUpArrowListeners, attachImageListeners, makeAlphabet, makeSlider } from './modules';

let sortKey = 0; // 0 = artist, 1 = title
let entries = { byAuthor: [], byTitle: [] };

const setUpSortButtons = () => {
	sortIds.forEach(id => {
		const alt = id === 'artist' ? 'title' : 'artist';

		const $button = document.getElementById(`js-by-${id}`);
		const $altButton = document.getElementById(`js-by-${alt}`);

		$button.addEventListener('click', () => {
			scrollToTop();
			sortKey = !sortKey;
			renderEntries();

			$button.classList.add('active');
			$altButton.classList.remove('active');
		})
	});
};

const makeCitation = (entry, i) => {
	const { credit, credit_link } = entry;
	const entryDescription = document.getElementById(`slider-${i}`).querySelector('.article-description');
	const citation = `<div class="article-credit">source: <a href="${credit_link}">${credit}</a></div>`;
	
	entryDescription.insertAdjacentHTML('beforeend', citation);
};

const renderEntries = () => {
	const entriesList = sortKey ? entries.byTitle : entries.byAuthor;

	$articleList.innerHTML = '';

	entriesList.forEach((entry, i) => {
		$articleList.insertAdjacentHTML('beforeend', articleTemplate(entry, i));
		makeSlider(document.getElementById(`slider-${i}`));

		if (entry.credit) {
			makeCitation(entry, i);
		}
	});

	if (window.screen.width > 768) attachImageListeners();

	$articleList.classList.add('ready');

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
	setUpSortButtons();
	attachUpArrowListeners();
	attachModalListeners();
};

init();
