const template =
	`<nav class="global-nav__outer">
		<div class="global-nav__inner">
			<div class="global-nav__primary-nav">
				<div class="global-nav__browse-by">
					<span class="browse-by__title">Browse by </span>
					<button class="browse-by__by-author" id="js-by-artist">Artist</button>
					<span class="browse-by__divider"> | </span>
					<button class="browse-by__by-title" id="js-by-title">Title</button>
				</div>
				<a class="global-nav__home js-home" href="#home">
					<span><i class="fas fa-angle-up"></i></span>
				</a>
				<div class="global-nav__search">
					<span class="search__title">Search</span>
					<input class="search__input"></input>
				</div>
			</div>
			<div class="global-nav__alphabet">
				<span class="alphabet__title">Browse to </span>
				<div class="alphabet__letters-outer">
					<span class="alphabet__letters-inner"></span>
				</div>
			</div>
		</div>
	</nav>`;

const globalNav = () => {
	let navOuter = document.getElementById('js-nav');
	navOuter.innerHTML = template;
};

export default globalNav;
