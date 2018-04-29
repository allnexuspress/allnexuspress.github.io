const build = (() => {
	const DB = 'https://nexus-catalog.firebaseio.com/posts.json?auth=7g7pyKKykN3N5ewrImhOaS6vwrFsc5fKkrk8ejzf';
	const alphabet = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z'];

	let articleTemplate = `
		<article class="article__outer">
			<div class="article__inner">
				<div class="article__heading">
					<h2 class="article-heading__title"></h2>
					<div class="article-heading__name">
						<span class="article-heading__name--first"></span>
						<span class="article-heading__name--last"></span>
					</div>
				</div>
				<div class="article__images-outer">
					<div class="article__images-inner"></div>
				</div>
			</div>
		</article>
	`

	const renderImages = (images) => {
		let $imagesNodes = document.querySelectorAll('.article__images-inner');
		let $images = $imagesNodes[$imagesNodes.length - 1];

		images.forEach(image => {
			let $img = document.createElement('IMG');
			$img.src = image;
			$images.append($img);
		})
	};

	const renderEntries = (entries) => {
		let $articleList = document.querySelector('.article-list');

		entries.forEach(entry => {
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

		})
	}

	const fetchData = () => {
			fetch(DB).then(res =>
				res.json()
			).then(entries => {
				renderEntries(entries);
			});
	};


	let state = {'scrollPosition': 0};

	const toggleTitle = () => {
		console.log('toggling title');
		let $elem = document.getElementById('js-list');
		let position = $elem.getBoundingClientRect();
		console.log('position.top: ', position.top)
		if (position.top > 200) console.log('it changed', position.top);
	};

	const makeScrollListener = () => {
		console.log("making listener");
			window.addEventListener('scroll', function() {
				console.log('scrolling')
		});
	};

	let isShowing = false;
	const toggleMobileNav = () => {
		let $nav = document.getElementById('js-nav');
		let $icon = document.getElementById('js-angle-icon');
		let $list = document.getElementById('js-list');
		console.log('nav is: ', $nav, '$list is: ', $list);
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
		};
	};

	const addMobileControlButton = () => {
		let $button = document.getElementById('js-mobile-nav');
		$button.addEventListener('click', toggleMobileNav);
	}

	const makeAlphabet = () => {
		let $outer = document.querySelector('.alphabet__letters-inner');

		alphabet.forEach(letter => {
			let $button = document.createElement('button');

			$button.innerHTML = letter.toUpperCase();
			$button.className = 'alphabet__letter-button';

			$outer.append($button);
		})
	};

	const init = () => {
		makeAlphabet();
		addMobileControlButton();
		makeScrollListener();
		fetchData();
	}

	init();

})();