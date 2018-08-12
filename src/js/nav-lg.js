const template = 
	`<div class="nav__inner">
		<div class="nav__sort-by">
			<span class="sort-by__title">Sort by</span>
			<button class="sort-by__by-artist active" id="js-by-artist">Artist</button>
			<span class="sort-by__divider"> | </span>
			<button class="sort-by__by-title" id="js-by-title">Title</button>
			<span class="sort-by__divider find"> | </span>
			<span class="find" id="js-find">&#8984;F</span>
		</div>
		<div class="nav__alphabet">
			<span class="alphabet__title">Go to</span>
			<div class="alphabet__letters"></div>
		</div>
	</div>`;

const navLg = () => {
	let navOuter = document.getElementById('js-nav');
	navOuter.innerHTML = template;
};

export default navLg;