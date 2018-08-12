import mobileNav from './nav-mobile';
import navLg from './nav-lg';

const DB = 'https://nexus-catalog.firebaseio.com/posts.json?auth=7g7pyKKykN3N5ewrImhOaS6vwrFsc5fKkrk8ejzf';
const alphabet = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'r', 's', 't', 'u', 'v', 'w', 'z'];

const $parallax = document.querySelector('.parallax');
const $content = document.querySelector('.content');
const $nav = document.getElementById('js-nav');
const $title = document.getElementById('js-title');

// 0 = artist, 1 = title
let sortKey = 0;
let entries = {
	byAuthor: [],
	byTitle: []
};
let activeEntries = {};
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
				<p class="js-description"></p>
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
				const target = letter === 'a' ? document.getElementById('anchor-target') : letterNode.parentElement.parentElement.parentElement.parentElement.previousElementSibling.querySelector('.js-description');
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
		$img.src = src;
		$images.append($img);
	})
};

const renderEntries = () => {
	let $articleList = document.getElementById('js-list');
	let entriesList = sortKey ? entries.byTitle : entries.byAuthor;

	$articleList.innerHTML = '';

	entriesList.forEach(entry => {
		let { title, lastName, firstName, description, images } = entry;

		$articleList.insertAdjacentHTML('beforeend', articleTemplate);

		let $imagesNodes = document.querySelectorAll('.article__images-inner');
		let $images = $imagesNodes[$imagesNodes.length - 1];

		if (images.length) renderImages(images, $images);
		
		let $descriptionNode = document.createElement('p');
		$descriptionNode.classList.add('.js-description', 'article-description');
		$descriptionNode.innerHTML = description;

		$images.append($descriptionNode);

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
			console.log(data);
			setData(data);
		})
		.then(() => {
		})
		.catch(err => console.warn(err));
};

const init = () => {
	fetchData();
	// mobileNav();
	navLg();
	makeAlphabet();
	addSortButtonListeners();
	// addMobileControlButton();
}

init();
