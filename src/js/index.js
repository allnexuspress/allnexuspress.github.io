import navLg from './nav-lg';
import articleTemplate from './article-template';

const DB = 'https://nexus-catalog.firebaseio.com/posts.json?auth=7g7pyKKykN3N5ewrImhOaS6vwrFsc5fKkrk8ejzf';
const alphabet = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'r', 's', 't', 'u', 'v', 'w', 'z'];

const $nav = document.getElementById('js-nav');
const $parallax = document.querySelector('.parallax');
const $content = document.querySelector('.content');
const $title = document.getElementById('js-title');
const $arrow = document.querySelector('.arrow');
const $modal = document.querySelector('.modal');
const $lightbox = document.querySelector('.lightbox');
const $view = document.querySelector('.lightbox-view');

let sortKey = 0; // 0 = artist, 1 = title
let entries = { byAuthor: [], byTitle: [] };
let activeEntries = {};

let lightbox = false;
const attachImageListeners = () => {
	const $images = Array.from(document.querySelectorAll('.article-image'));
	console.log('images: ', $images);

	$images.forEach(img => {
		img.addEventListener('click', () => {
			console.log('cliked ', img.src)
			let src = img.src;
			$lightbox.classList.add('show-img');
			$view.setAttribute('style', `background-image: url(${src})`);
			lightbox = true;
		})
	});

	$view.addEventListener('click', () => {
		if (lightbox) {
			$lightbox.classList.remove('show-img');
			lightbox = false;
		}
	});
}

let modal = false;
const attachModalListeners = () => {
	const $find = document.getElementById('js-find');
	
	$find.addEventListener('click', () => {
		$modal.classList.add('show');
		modal = true;
	});

	$modal.addEventListener('click', () => {
		setTimeout(() => {
			$modal.classList.remove('show');
			modal = false;
		}, 500);
	});

	window.addEventListener('keydown', () => {
		// preventDefault();
		console.log('keydown');
		if (modal) {
			$modal.classList.remove('show');
			modal = false;
		}
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
		scrollToTop();
		if (sortKey) {
			sortKey = 0;
			$byArtist.classList.add('active');
			$byTitle.classList.remove('active');
			renderEntries();
		}
	});

	$byTitle.addEventListener('click', () => {
		scrollToTop();
		if (!sortKey) {
			sortKey = 1;
			$byTitle.classList.add('active');
			$byArtist.classList.remove('active');
			renderEntries();
		}
	});
};

const makeAlphabet = () => {
	let $outer = document.querySelector('.alphabet__letters');
	$outer.innerHTML = '';

	alphabet.forEach(letter => {
		let $anchor = document.createElement('a');

		$anchor.innerHTML = letter.toUpperCase();
		$anchor.className = 'alphabet__letter-anchor';
		if (activeEntries[letter]) {
			$anchor.classList.add('u-active');
			$anchor.addEventListener('click', () => {
				const letterNode = document.getElementById(letter);
				const target = letter === 'a' ? document.getElementById('anchor-target') : letterNode.parentElement.parentElement.parentElement.parentElement.previousElementSibling.querySelector('.js-article-anchor-target');
				console.log('target: ', target);
				target.scrollIntoView({behavior: "smooth", block: "start"});
			})
		}
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
			firstEntry.setAttribute('id', char);
		}
	});

	makeAlphabet();
};

const renderImages = (images, $images) => {
	images.forEach(image => {
		const src = `../../assets/images/${image}`;
		let $img = document.createElement('IMG');
		$img.className = 'article-image';
		$img.src = src;
		$images.append($img);
	})
};

const renderEntries = () => {
	let $articleList = document.getElementById('js-list');
	let entriesList = sortKey ? entries.byTitle : entries.byAuthor;

	$articleList.innerHTML = '';

	entriesList.forEach(entry => {
		let { title, lastName, firstName, images, description, detail } = entry;

		$articleList.insertAdjacentHTML('beforeend', articleTemplate);

		let $imagesNodes = document.querySelectorAll('.article__images-inner');
		let $images = $imagesNodes[$imagesNodes.length - 1];

		if (images.length) renderImages(images, $images);
		
		let $descriptionOuter = document.createElement('div');
		let $descriptionNode = document.createElement('p');
		let $detailNode = document.createElement('p');
		$descriptionOuter.classList.add('article-description__outer');
		$descriptionNode.classList.add('article-description');
		$detailNode.classList.add('article-detail');

		$descriptionNode.innerHTML = description;
		$detailNode.innerHTML = detail;

		$descriptionOuter.append($descriptionNode, $detailNode);
		$images.append($descriptionOuter);

		let $titleNodes = document.querySelectorAll('.article-heading__title');
		let $title = $titleNodes[$titleNodes.length - 1];

		let $firstNodes = document.querySelectorAll('.article-heading__name--first');
		let $first = $firstNodes[$firstNodes.length - 1];

		let $lastNodes = document.querySelectorAll('.article-heading__name--last');
		let $last = $lastNodes[$lastNodes.length - 1];

		$title.innerHTML = title;
		$first.innerHTML = firstName;
		$last.innerHTML = lastName;

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
			attachImageListeners();
		})
		.catch(err => console.warn(err));
};

const init = () => {
	fetchData();
	navLg();
	makeAlphabet();
	addSortButtonListeners();
	attachArrowListeners();
	attachModalListeners();
}

init();
